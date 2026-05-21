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
    actionRegistry,
    conditionNodeSchema,
    conditionRegistry,
    contextResolverRegistry,
    EntityScope,
    evaluateCondition,
    executeAction,
    init,
    setFieldsAction,
} from '../index.js';

const executeSpy = mock(
    async (query?: any): Promise<any> => ({ rows: [] as any[] }),
);

describe('Auto Action Module - Isolated Engines', () => {
    let originalExecuteQuery: any;

    beforeEach(async () => {
        executeSpy.mockClear();
        const executor = db.getExecutor();
        originalExecuteQuery = executor.executeQuery;
        executor.executeQuery = executeSpy;

        // Reset registries before each test to start with a fresh registration
        conditionRegistry.clear();
        actionRegistry.clear();
        contextResolverRegistry.clear();
        await init();
    });

    afterEach(() => {
        db.getExecutor().executeQuery = originalExecuteQuery;
    });

    describe('Registries Isolation', () => {
        it('should correctly register actions in ActionRegistry on initialization', () => {
            const actions = actionRegistry.getAllActions();
            expect(actions.map((a) => a.id)).toContain('set-fields');
        });

        it('should correctly register task conditions in ConditionRegistry on initialization', () => {
            const conditions = conditionRegistry.getAllConditions();
            const conditionTypes = conditions.map((c) => c.type);

            expect(conditionTypes).toContain('TaskFieldChanged');
            expect(conditionTypes).toContain('TaskFieldChangedTo');
            expect(conditionTypes).toContain('TaskFieldChangedFrom');
            expect(conditionTypes).toContain('TaskFieldChangedFromTo');
            expect(conditionTypes).toContain('TaskTeamChanged');
            expect(conditionTypes).toContain('TaskTeamAssigned');
            expect(conditionTypes).toContain('TaskTeamUnassigned');
            expect(conditionTypes).toContain('TaskMemberChanged');
            expect(conditionTypes).toContain('TaskMemberAssigned');
            expect(conditionTypes).toContain('TaskMemberUnassigned');
        });

        it('should throw error when registering a duplicate condition', () => {
            const firstCondition = conditionRegistry.getAllConditions()[0];
            expect(firstCondition).toBeDefined();
            expect(() => {
                conditionRegistry.registerCondition(firstCondition!);
            }).toThrow(/already registered/);
        });

        it('should throw error when registering a duplicate action', () => {
            const firstAction = actionRegistry.getAllActions()[0];
            expect(firstAction).toBeDefined();
            expect(() => {
                actionRegistry.registerAction(firstAction!);
            }).toThrow(/already registered/);
        });
    });

    describe('executeAction helper', () => {
        const ctx = {
            traceId: 'trace-123',
            scope: EntityScope.TASK as const,
            actorId: 'user-1',
            taskId: 'task-uuid-1',
            projectId: 'project-1',
        };

        it('should execute action via executeAction with correct input validation', async () => {
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

            await executeAction('set-fields', ctx, {
                status: 'IN_PROGRESS',
                teamId: 'team-456',
            });

            const updateCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('update') ||
                    call[0].sql.includes('UPDATE'),
            );
            expect(updateCall).toBeDefined();
            expect(updateCall?.[0].parameters).toContain('IN_PROGRESS');
            expect(updateCall?.[0].parameters).toContain('team-456');
        });

        it('should fail validation for invalid inputs', async () => {
            // teamId is expected to be string/null/undefined, passing a number should fail Zod validation
            await expect(
                executeAction('set-fields', ctx, {
                    teamId: 12345 as any,
                }),
            ).rejects.toThrow();
        });

        it('should throw error if attempting to execute unregistered action', async () => {
            await expect(
                executeAction('non-existent-action', ctx, {}),
            ).rejects.toThrow(/is not registered/);
        });
    });

    describe('SetFields Action Handler', () => {
        it('should fetch fresh task, update multiple fields via taskService', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') || sql.includes('SELECT')) {
                    return {
                        rows: [
                            {
                                id: 'task-uuid-1',
                                fk_project_id: 'project-1',
                                fk_team_id: null,
                                fk_member_id: null,
                                title: 'Task Title',
                                status: 'TODO',
                                priority: 1,
                                version: 3,
                                prev_status: null,
                                prev_priority: null,
                                prev_title: null,
                                prev_team_id: null,
                                prev_member_id: null,
                            },
                        ],
                    };
                }
                // TaskQueries.updateTask uses complex raw SQL — return a valid updated task row
                return {
                    rows: [
                        {
                            id: 'task-uuid-1',
                            fk_project_id: 'project-1',
                            fk_team_id: 'team-456',
                            fk_member_id: 'user-789',
                            title: 'Task Title',
                            status: 'IN_PROGRESS',
                            priority: 1,
                            version: 4,
                            description: null,
                            created_by: 'user-1',
                            updated_by: 'user-1',
                            created_at: new Date(),
                            updated_at: new Date(),
                        },
                    ],
                };
            });

            const ctx = {
                traceId: 'trace-123',
                scope: EntityScope.TASK as const,
                actorId: 'user-1',
                taskId: 'task-uuid-1',
                projectId: 'project-1',
            };

            // Should complete without throwing
            await setFieldsAction.handler(ctx, {
                status: 'IN_PROGRESS',
                teamId: 'team-456',
                memberId: 'user-789',
            });

            // Verify a SELECT was made (getTaskContextById via taskService)
            const selectCall = executeSpy.mock.calls.find(
                (call) =>
                    (call[0].sql.includes('select') ||
                        call[0].sql.includes('SELECT')) &&
                    call[0].sql.includes('project_task'),
            );
            expect(selectCall).toBeDefined();
            expect(selectCall?.[0].parameters).toContain('task-uuid-1');

            // Verify an UPDATE was issued (via taskService.updateTask → TaskQueries.updateTask)
            const updateCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('update') ||
                    call[0].sql.includes('UPDATE') ||
                    call[0].sql.includes('version'),
            );
            expect(updateCall).toBeDefined();
        });

        it('should throw if task is not found during setFields', async () => {
            executeSpy.mockImplementation(async () => ({ rows: [] }));

            const ctx = {
                traceId: 'trace-123',
                scope: EntityScope.TASK as const,
                actorId: 'user-1',
                taskId: 'task-uuid-nonexistent',
                projectId: 'project-1',
            };

            await expect(
                setFieldsAction.handler(ctx, { status: 'IN_PROGRESS' }),
            ).rejects.toThrow('not found');
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

            it('should throw error when unrecognized condition predicate type is encountered', () => {
                expect(() => {
                    evaluateCondition(
                        { type: 'UnrecognizedCondition' as any },
                        dummyContext,
                    );
                }).toThrow(/Unrecognized condition predicate type/);
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
