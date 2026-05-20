import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { db } from '../../../database/index.js';

// Mock logger to avoid cluttering test outputs
const loggerPathJs = import.meta.resolve('../../../logger/index.js');
mock.module(loggerPathJs, () => ({
    logger: {
        info: mock(() => {}),
        error: mock(() => {}),
        debug: mock(() => {}),
    },
}));

import type { ConditionNode } from '../index.js';
import {
    autoActionRegistry,
    conditionNodeSchema,
    EntityScope,
    evaluateCondition,
    getTemplateForScope,
    init,
    setFieldsAction,
} from '../index.js';

const executeSpy = mock(
    async (query?: any): Promise<any> => ({ rows: [] as any[] }),
);

describe('Auto Action Module', () => {
    let originalExecuteQuery: any;

    beforeEach(async () => {
        executeSpy.mockClear();
        const executor = db.getExecutor();
        originalExecuteQuery = executor.executeQuery;
        executor.executeQuery = executeSpy;

        // Reset the registry before each test to start with a fresh registration
        autoActionRegistry.clear();
        await init();
    });

    afterEach(() => {
        db.getExecutor().executeQuery = originalExecuteQuery;
    });

    describe('Registry & Template Generation', () => {
        it('should correctly register triggers and actions on initialization', () => {
            const triggers = autoActionRegistry.getAllTriggers();
            const actions = autoActionRegistry.getAllActions();

            expect(triggers.map((t) => t.id)).toContain('task.created');
            expect(triggers.map((t) => t.id)).toContain('task.updated');
            expect(actions.map((a) => a.id)).toContain('set-fields');
        });

        it('should return a rich metadata template for the TASK scope with conditionTypes', () => {
            const template = getTemplateForScope(EntityScope.TASK);

            expect(template.scope).toBe(EntityScope.TASK);
            expect(template.triggers.map((t) => t.id)).toContain(
                'task.created',
            );
            expect(template.triggers.map((t) => t.id)).toContain(
                'task.updated',
            );

            const setFieldsMetadata = template.actions.find(
                (a) => a.id === 'set-fields',
            );
            expect(setFieldsMetadata).toBeDefined();
            expect(setFieldsMetadata?.inputs.status).toEqual({
                type: 'string',
                required: false,
            });

            expect(template.contextFields).toContain('taskId');
            expect(template.contextFields).toContain('prev_status');
            expect(template.contextFields).toContain('current_status');

            // Assert that new condition types are output instead of comparison operators
            const conditionNames = template.conditionTypes.map((c) => c.type);
            expect(conditionNames).toContain('TaskFieldChanged');
            expect(conditionNames).toContain('TaskFieldChangedTo');
            expect(conditionNames).toContain('TaskTeamAssigned');
            expect(conditionNames).toContain('TaskMemberUnassigned');
            expect(conditionNames).not.toContain('eq');
            expect(conditionNames).not.toContain('gt');

            // Assert that all condition types have the isAsync: false property
            for (const c of template.conditionTypes) {
                expect(c.isAsync).toBe(false);
            }
        });

        it('should print the dynamic scope template for easy visualization', () => {
            const template = getTemplateForScope(EntityScope.TASK);
            console.log('\n--- SCOPED AUTOMATION TEMPLATE ---');
            console.log(JSON.stringify(template, null, 2));
            console.log('----------------------------------\n');
            expect(template).toBeDefined();
        });
    });

    describe('SetFields Action', () => {
        it('should fetch fresh task, update multiple fields and version using optimistic locking', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') || sql.includes('SELECT')) {
                    return {
                        rows: [
                            {
                                id: 'task-uuid-1',
                                version: 3,
                                status: 'TODO',
                                fk_team_id: null,
                                fk_member_id: null,
                            },
                        ],
                    };
                }
                if (sql.includes('update') || sql.includes('UPDATE')) {
                    return {
                        numUpdatedRows: 1n,
                        numAffectedRows: 1n,
                        rows: [],
                    };
                }
                return { rows: [] };
            });

            const ctx = {
                traceId: 'trace-123',
                scope: EntityScope.TASK as const,
                actorId: 'user-1',
                taskId: 'task-uuid-1',
                projectId: 'project-1',
            };

            await setFieldsAction.handler(ctx, {
                status: 'IN_PROGRESS',
                teamId: 'team-456',
                memberId: 'user-789',
            });

            const selectCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('select') ||
                    call[0].sql.includes('SELECT'),
            );
            expect(selectCall).toBeDefined();
            expect(selectCall?.[0].parameters).toContain('task-uuid-1');

            const updateCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('update') ||
                    call[0].sql.includes('UPDATE'),
            );
            expect(updateCall).toBeDefined();
            expect(updateCall?.[0].parameters).toContain('IN_PROGRESS');
            expect(updateCall?.[0].parameters).toContain('team-456');
            expect(updateCall?.[0].parameters).toContain('user-789');
            expect(updateCall?.[0].parameters).toContain(4); // New version
            expect(updateCall?.[0].parameters).toContain(3); // Old version
        });

        it('should throw concurrent update error if optimistic lock fails (0 rows updated)', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') || sql.includes('SELECT')) {
                    return {
                        rows: [
                            {
                                id: 'task-uuid-1',
                                version: 3,
                                status: 'TODO',
                            },
                        ],
                    };
                }
                if (sql.includes('update') || sql.includes('UPDATE')) {
                    return {
                        numUpdatedRows: 0n,
                        numAffectedRows: 0n,
                        rows: [],
                    };
                }
                return { rows: [] };
            });

            const ctx = {
                traceId: 'trace-123',
                scope: EntityScope.TASK as const,
                actorId: 'user-1',
                taskId: 'task-uuid-1',
                projectId: 'project-1',
            };

            expect(
                setFieldsAction.handler(ctx, { status: 'IN_PROGRESS' }),
            ).rejects.toThrow('Optimistic lock failure');
        });
    });

    describe('Hardcoded Condition Evaluator', () => {
        const dummyContext = {
            traceId: 'trace-123',
            scope: EntityScope.TASK as const,
            actorId: 'user-1',
            taskId: 'task-uuid-1',
            projectId: 'project-1',
            prev_status: 'TODO',
            current_status: 'IN_PROGRESS',
            prev_priority: 1,
            current_priority: 2,
            prev_title: 'Old Title',
            current_title: 'New Title',
            prev_team_id: null,
            current_team_id: 'team-456',
            prev_member_id: null,
            current_member_id: 'member-789',
            prev_version: 5,
            current_version: 6,
        };

        describe('Standard Fields Transition Predicates', () => {
            it('should evaluate TaskFieldChanged', () => {
                expect(
                    evaluateCondition(
                        { type: 'TaskFieldChanged', field: 'status' },
                        dummyContext,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        { type: 'TaskFieldChanged', field: 'priority' },
                        dummyContext,
                    ),
                ).toBe(true);

                const unchangedCtx = {
                    ...dummyContext,
                    prev_status: 'IN_PROGRESS',
                    current_status: 'IN_PROGRESS',
                };
                expect(
                    evaluateCondition(
                        { type: 'TaskFieldChanged', field: 'status' },
                        unchangedCtx,
                    ),
                ).toBe(false);
            });

            it('should evaluate TaskFieldChangedTo', () => {
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedTo',
                            field: 'status',
                            to: 'IN_PROGRESS',
                        },
                        dummyContext,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedTo',
                            field: 'status',
                            to: 'DONE',
                        },
                        dummyContext,
                    ),
                ).toBe(false);

                const unchangedCtx = {
                    ...dummyContext,
                    prev_status: 'IN_PROGRESS',
                    current_status: 'IN_PROGRESS',
                };
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedTo',
                            field: 'status',
                            to: 'IN_PROGRESS',
                        },
                        unchangedCtx,
                    ),
                ).toBe(false);
            });

            it('should evaluate TaskFieldChangedFrom', () => {
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedFrom',
                            field: 'status',
                            from: 'TODO',
                        },
                        dummyContext,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedFrom',
                            field: 'status',
                            from: 'DONE',
                        },
                        dummyContext,
                    ),
                ).toBe(false);

                const unchangedCtx = {
                    ...dummyContext,
                    prev_status: 'TODO',
                    current_status: 'TODO',
                };
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedFrom',
                            field: 'status',
                            from: 'TODO',
                        },
                        unchangedCtx,
                    ),
                ).toBe(false);
            });

            it('should evaluate TaskFieldChangedFromTo', () => {
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedFromTo',
                            field: 'status',
                            from: 'TODO',
                            to: 'IN_PROGRESS',
                        },
                        dummyContext,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskFieldChangedFromTo',
                            field: 'status',
                            from: 'TODO',
                            to: 'DONE',
                        },
                        dummyContext,
                    ),
                ).toBe(false);
            });
        });

        describe('Team Transitions Predicates', () => {
            it('should evaluate TaskTeamChanged', () => {
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamChanged' },
                        dummyContext,
                    ),
                ).toBe(true);

                const unchangedCtx = {
                    ...dummyContext,
                    prev_team_id: 'team-456',
                    current_team_id: 'team-456',
                };
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamChanged' },
                        unchangedCtx,
                    ),
                ).toBe(false);
            });

            it('should evaluate TaskTeamAssigned', () => {
                // Any team assignment from null
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamAssigned' },
                        dummyContext,
                    ),
                ).toBe(true);

                // Specific team matching
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamAssigned', teamId: 'team-456' },
                        dummyContext,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamAssigned', teamId: 'team-wrong' },
                        dummyContext,
                    ),
                ).toBe(false);

                const alreadyAssignedCtx = {
                    ...dummyContext,
                    prev_team_id: 'team-111',
                    current_team_id: 'team-456',
                };
                // Generic assigned expects prev_team_id to be null
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamAssigned' },
                        alreadyAssignedCtx,
                    ),
                ).toBe(false);
                // But specific assignment should evaluate true since team changed from team-111 to team-456
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamAssigned', teamId: 'team-456' },
                        alreadyAssignedCtx,
                    ),
                ).toBe(true);
            });

            it('should evaluate TaskTeamUnassigned', () => {
                const unassignedCtx = {
                    ...dummyContext,
                    prev_team_id: 'team-456',
                    current_team_id: null,
                };
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamUnassigned' },
                        unassignedCtx,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        { type: 'TaskTeamUnassigned' },
                        dummyContext,
                    ),
                ).toBe(false);
            });
        });

        describe('Member Transitions Predicates', () => {
            it('should evaluate TaskMemberChanged', () => {
                expect(
                    evaluateCondition(
                        { type: 'TaskMemberChanged' },
                        dummyContext,
                    ),
                ).toBe(true);

                const unchangedCtx = {
                    ...dummyContext,
                    prev_member_id: 'member-789',
                    current_member_id: 'member-789',
                };
                expect(
                    evaluateCondition(
                        { type: 'TaskMemberChanged' },
                        unchangedCtx,
                    ),
                ).toBe(false);
            });

            it('should evaluate TaskMemberAssigned', () => {
                expect(
                    evaluateCondition(
                        { type: 'TaskMemberAssigned' },
                        dummyContext,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        { type: 'TaskMemberAssigned', memberId: 'member-789' },
                        dummyContext,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        {
                            type: 'TaskMemberAssigned',
                            memberId: 'member-wrong',
                        },
                        dummyContext,
                    ),
                ).toBe(false);
            });

            it('should evaluate TaskMemberUnassigned', () => {
                const unassignedCtx = {
                    ...dummyContext,
                    prev_member_id: 'member-789',
                    current_member_id: null,
                };
                expect(
                    evaluateCondition(
                        { type: 'TaskMemberUnassigned' },
                        unassignedCtx,
                    ),
                ).toBe(true);
                expect(
                    evaluateCondition(
                        { type: 'TaskMemberUnassigned' },
                        dummyContext,
                    ),
                ).toBe(false);
            });
        });

        describe('Logical Branching & AST Verification', () => {
            it('should evaluate nested AND, OR, NOT operations', () => {
                const complexAST: ConditionNode = {
                    type: 'logical',
                    operator: 'AND',
                    children: [
                        {
                            type: 'logical',
                            operator: 'OR',
                            children: [
                                {
                                    type: 'TaskFieldChangedTo',
                                    field: 'status',
                                    to: 'IN_PROGRESS',
                                },
                                {
                                    type: 'TaskTeamAssigned',
                                    teamId: 'team-wrong',
                                },
                            ],
                        },
                        {
                            type: 'logical',
                            operator: 'NOT',
                            children: [
                                {
                                    type: 'TaskFieldChangedTo',
                                    field: 'priority',
                                    to: 5,
                                },
                            ],
                        },
                    ],
                };

                expect(evaluateCondition(complexAST, dummyContext)).toBe(true);
            });
        });

        describe('Zod Schema AST Validation', () => {
            it('should validate valid hardcoded predicate and logical nodes', () => {
                const validPredicate = {
                    type: 'TaskFieldChangedTo',
                    field: 'status',
                    to: 'IN_PROGRESS',
                };
                const result1 = conditionNodeSchema.safeParse(validPredicate);
                expect(result1.success).toBe(true);

                const validTeamPredicate = {
                    type: 'TaskTeamAssigned',
                    teamId: 'team-456',
                };
                const result2 =
                    conditionNodeSchema.safeParse(validTeamPredicate);
                expect(result2.success).toBe(true);

                const validLogical = {
                    type: 'logical',
                    operator: 'AND',
                    children: [validPredicate, validTeamPredicate],
                };
                const result3 = conditionNodeSchema.safeParse(validLogical);
                expect(result3.success).toBe(true);
            });

            it('should reject invalid structures or standard mathematical operators', () => {
                // Reject generic operator structures
                const invalidOperator = {
                    type: 'predicate',
                    field: 'status',
                    operator: 'eq',
                    value: 'IN_PROGRESS',
                };
                const result1 = conditionNodeSchema.safeParse(invalidOperator);
                expect(result1.success).toBe(false);

                // Reject fields that belong strictly to custom team nodes inside generic change nodes
                const invalidField = {
                    type: 'TaskFieldChangedTo',
                    field: 'team_id', // excluded
                    to: 'team-123',
                };
                const result2 = conditionNodeSchema.safeParse(invalidField);
                expect(result2.success).toBe(false);
            });
        });
    });
});
