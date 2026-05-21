import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { z } from 'zod';
import { db } from '../../../database/index.js';
import { autoActionService, EntityScope, init } from '../index.js';
import { actionRegistry } from '../internal/engines/actionEngine.js';
import { conditionRegistry } from '../internal/engines/conditionEngine.js';
import { contextResolverRegistry } from '../internal/engines/contextEngine.js';
import {
    executeAutoActionPipeline,
    executeAutoActionStep,
    type StepResumeCursor,
} from '../internal/execution/executor.js';
import { getTemplateForScope } from '../internal/execution/template.js';

// Mock logger to avoid cluttering test outputs
const loggerPathJs = import.meta.resolve('../../../logger/index.js');
mock.module(loggerPathJs, () => ({
    logger: {
        info: mock(() => {}),
        error: mock(() => {}),
        debug: mock(() => {}),
    },
}));

const executeSpy = mock(
    async (query?: any): Promise<any> => ({ rows: [] as any[] }),
);

describe('Auto Action Engine Orchestrator', () => {
    let originalExecuteQuery: any;

    beforeEach(async () => {
        executeSpy.mockClear();
        const executor = db.getExecutor();
        originalExecuteQuery = executor.executeQuery;
        executor.executeQuery = executeSpy;

        // Reset and init registries
        conditionRegistry.clear();
        actionRegistry.clear();
        contextResolverRegistry.clear();
        await init();

        // Register custom test actions
        actionRegistry.registerAction({
            id: 'test-sync-action',
            name: 'Test Sync Action',
            description: 'A synchronous test action',
            isAsync: false,
            scope: EntityScope.TASK,
            inputSchema: z.object({ value: z.string() }),
            handler: async (ctx, inputs) => inputs.value,
        });

        actionRegistry.registerAction({
            id: 'test-async-action',
            name: 'Test Async Action',
            description: 'An asynchronous test action',
            isAsync: true,
            scope: EntityScope.TASK,
            inputSchema: z.object({ value: z.string() }),
            handler: async (ctx, inputs) => inputs.value,
        });
    });

    afterEach(() => {
        db.getExecutor().executeQuery = originalExecuteQuery;
        // Make sure standard condition isAsync is reset
        const cond = conditionRegistry.getCondition('TaskFieldChangedTo');
        if (cond) {
            (cond as any).isAsync = false;
        }
    });

    describe('Manager - CRUD, OCC, Sync-Safety & Name Uniqueness', () => {
        const projectId = 'proj-uuid-123';

        it('should correctly create an auto-action and validate sync-safety', async () => {
            // Mock no conflicts in uniqueness check, then returning created row
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') && sql.includes('auto_action')) {
                    return { rows: [] }; // No existing conflicting active auto action
                }
                if (sql.includes('insert') && sql.includes('auto_action')) {
                    return {
                        rows: [
                            {
                                id: 'action-uuid-1',
                                fk_project_id: projectId,
                                name: 'My Sync Flow',
                                description: 'A test flow',
                                is_active: true,
                                is_sync: true,
                                steps: JSON.stringify([
                                    {
                                        type: 'action',
                                        actionId: 'test-sync-action',
                                        inputs: { value: 'hello' },
                                    },
                                ]),
                                triggers: '[]',
                                version: 1,
                                created_by: 'user-1',
                                updated_by: 'user-1',
                            },
                        ],
                    };
                }
                return { rows: [] };
            });

            const action = await autoActionService.createAutoAction({
                fk_project_id: projectId,
                name: 'My Sync Flow',
                description: 'A test flow',
                is_active: true,
                is_sync: true,
                steps: [
                    {
                        type: 'action',
                        actionId: 'test-sync-action',
                        inputs: { value: 'hello' },
                    },
                ] as any,
                triggers: [] as any,
                created_by: 'user-1',
                updated_by: 'user-1',
            });

            expect(action.id).toBe('action-uuid-1');
            expect(action.name).toBe('My Sync Flow');
            expect(action.is_sync).toBe(true);
        });

        it('should block creation of sync flow containing async action', async () => {
            await expect(
                autoActionService.createAutoAction({
                    fk_project_id: projectId,
                    name: 'My Sync Flow',
                    is_active: true,
                    is_sync: true,
                    steps: [
                        {
                            type: 'action',
                            actionId: 'test-async-action', // ASYNC ACTION IN SYNC FLOW
                            inputs: { value: 'hello' },
                        },
                    ] as any,
                    triggers: [] as any,
                    created_by: 'user-1',
                    updated_by: 'user-1',
                }),
            ).rejects.toThrow(
                /configured as synchronous but contains asynchronous steps/,
            );
        });

        it('should block creation of sync flow containing async condition', async () => {
            const cond = conditionRegistry.getCondition('TaskFieldChangedTo')!;
            (cond as any).isAsync = true; // Temporarily make it async for test

            await expect(
                autoActionService.createAutoAction({
                    fk_project_id: projectId,
                    name: 'My Sync Flow',
                    is_active: true,
                    is_sync: true,
                    steps: [
                        {
                            type: 'condition_action',
                            condition: {
                                type: 'TaskFieldChangedTo',
                                field: 'status',
                                to: 'IN_PROGRESS',
                            },
                            actionId: 'test-sync-action',
                            inputs: { value: 'hello' },
                        },
                    ] as any,
                    triggers: [] as any,
                    created_by: 'user-1',
                    updated_by: 'user-1',
                }),
            ).rejects.toThrow(
                /configured as synchronous but contains asynchronous steps/,
            );
        });

        it('should block creation if active name is already taken within project', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') && sql.includes('auto_action')) {
                    // Conflicting active name found
                    return { rows: [{ id: 'existing-uuid' }] };
                }
                return { rows: [] };
            });

            await expect(
                autoActionService.createAutoAction({
                    fk_project_id: projectId,
                    name: 'Duplicate Flow',
                    is_active: true,
                    steps: [] as any,
                    triggers: [] as any,
                    created_by: 'user-1',
                    updated_by: 'user-1',
                }),
            ).rejects.toThrow(
                /An active auto-action with the name "Duplicate Flow" already exists/,
            );
        });

        it('should enforce Optimistic Concurrency Control during update', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') && sql.includes('auto_action')) {
                    // Return the existing state with version = 5
                    return {
                        rows: [
                            {
                                id: 'action-uuid-1',
                                fk_project_id: projectId,
                                name: 'My Flow',
                                steps: '[]',
                                triggers: '[]',
                                is_active: true,
                                is_sync: true,
                                version: 5,
                            },
                        ],
                    };
                }
                return { rows: [] };
            });

            // Updating with expectedVersion = 4 (mismatch! should fail)
            await expect(
                autoActionService.updateAutoAction(
                    'action-uuid-1',
                    { name: 'Updated Flow' },
                    4,
                ),
            ).rejects.toThrow(
                /Optimistic locking failure: expected version 4 but found 5/,
            );
        });
    });

    describe('Executor - Step Processing and Suspendable Pipeline', () => {
        const taskId = 'task-uuid-999';

        it('should evaluate and execute action step', async () => {
            // Mock Context fetch returning a valid task context
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') && sql.includes('project_task')) {
                    return {
                        rows: [
                            {
                                id: taskId,
                                fk_project_id: 'proj-1',
                                fk_team_id: 'team-1',
                                fk_member_id: 'member-1',
                                title: 'Task Name',
                                status: 'TODO',
                                priority: 1,
                                version: 1,
                                prev_status: null,
                                prev_priority: null,
                                prev_title: null,
                                prev_team_id: null,
                                prev_member_id: null,
                            },
                        ],
                    };
                }
                return { rows: [] };
            });

            const result = await executeAutoActionStep(
                {
                    type: 'action',
                    actionId: 'test-sync-action',
                    inputs: { value: 'run-step' },
                },
                'TASK',
                taskId,
                'actor-1',
                'trace-1',
            );

            expect(result).toBe(true);
        });

        it('should skip condition_action step if condition evaluates to false', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                if (
                    query.sql.includes('select') &&
                    query.sql.includes('project_task')
                ) {
                    return {
                        rows: [
                            {
                                id: taskId,
                                fk_project_id: 'proj-1',
                                title: 'Task Name',
                                status: 'TODO',
                                priority: 1,
                                version: 1,
                                prev_status: null,
                                prev_priority: null,
                                prev_title: null,
                                prev_team_id: null,
                                prev_member_id: null,
                            },
                        ],
                    };
                }
                return { rows: [] };
            });

            const result = await executeAutoActionStep(
                {
                    type: 'condition_action',
                    condition: {
                        type: 'TaskFieldChangedTo',
                        field: 'status',
                        to: 'IN_PROGRESS', // Current status in mock is TODO, so evaluates to FALSE
                    },
                    actionId: 'test-sync-action',
                    inputs: { value: 'run-step' },
                },
                'TASK',
                taskId,
                'actor-1',
                'trace-1',
            );

            expect(result).toBe(false); // skipped
        });

        it('should execute condition_action step if condition evaluates to true', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                if (
                    query.sql.includes('select') &&
                    query.sql.includes('project_task')
                ) {
                    return {
                        rows: [
                            {
                                id: taskId,
                                fk_project_id: 'proj-1',
                                title: 'Task Name',
                                status: 'TODO',
                                priority: 1,
                                version: 1,
                            },
                        ],
                    };
                }
                return { rows: [] };
            });

            const result = await executeAutoActionStep(
                {
                    type: 'condition_action',
                    condition: {
                        type: 'TaskFieldChangedTo',
                        field: 'status',
                        to: 'TODO', // Current status in mock is TODO, so evaluates to TRUE
                    },
                    actionId: 'test-sync-action',
                    inputs: { value: 'run-step' },
                },
                'TASK',
                taskId,
                'actor-1',
                'trace-1',
            );

            expect(result).toBe(true); // executed
        });

        it('should execute sequential pipeline and return correct suspension points', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') && sql.includes('auto_action')) {
                    return {
                        rows: [
                            {
                                id: 'action-uuid-10',
                                fk_project_id: 'proj-1',
                                name: 'Flow 10',
                                is_active: true,
                                steps: JSON.stringify([
                                    {
                                        type: 'action',
                                        actionId: 'test-sync-action',
                                        inputs: { value: 'step 0' },
                                    },
                                    {
                                        type: 'action',
                                        actionId: 'test-sync-action',
                                        inputs: { value: 'step 1' },
                                    },
                                    {
                                        type: 'action',
                                        actionId: 'test-sync-action',
                                        inputs: { value: 'step 2' },
                                    },
                                ]),
                                triggers: '[]',
                                version: 1,
                            },
                        ],
                    };
                }
                if (sql.includes('select') && sql.includes('project_task')) {
                    return {
                        rows: [
                            {
                                id: taskId,
                                fk_project_id: 'proj-1',
                                title: 'Task Name',
                                status: 'TODO',
                                priority: 1,
                                version: 1,
                                prev_status: null,
                                prev_priority: null,
                                prev_title: null,
                                prev_team_id: null,
                                prev_member_id: null,
                            },
                        ],
                    };
                }
                return { rows: [] };
            });

            // Start pipeline execution from index 1 (skipping step 0)
            const result = await executeAutoActionPipeline(
                'action-uuid-10',
                taskId,
                'actor-1',
                'trace-1',
                undefined,
                1,
            );

            expect(result.completed).toBe(true);
            expect(result.lastProcessedIndex).toBe(2); // Processed steps 1 and 2
        });
    });

    describe('Executor - Condition Splitting', () => {
        const taskId = 'task-uuid-split';

        const taskRowMock = {
            id: taskId,
            fk_project_id: 'proj-1',
            title: 'Task Name',
            status: 'TODO',
            priority: 1,
            version: 1,
            prev_status: null,
            prev_priority: null,
            prev_title: null,
            prev_team_id: null,
            prev_member_id: null,
        };

        beforeEach(() => {
            executeSpy.mockImplementation(async (query: any) => {
                if (
                    query.sql.includes('select') &&
                    query.sql.includes('project_task')
                ) {
                    return { rows: [taskRowMock] };
                }
                return { rows: [] };
            });
        });

        it('should evaluate condition from child index 1 of an AND node, skipping child 0', async () => {
            // The condition is an AND of two predicates.
            // Child 0: status changed to 'DONE' (would FAIL — status is 'TODO').
            // Child 1: status changed to 'TODO' (will PASS).
            // With conditionChildIndex=1 we skip child 0 entirely, so overall: PASS.
            const cursor: StepResumeCursor = { conditionChildIndex: 1 };

            const result = await executeAutoActionStep(
                {
                    type: 'condition_action',
                    condition: {
                        type: 'logical',
                        operator: 'AND',
                        children: [
                            {
                                type: 'TaskFieldChangedTo',
                                field: 'status',
                                to: 'DONE', // child 0 — would fail if evaluated
                            },
                            {
                                type: 'TaskFieldChangedTo',
                                field: 'status',
                                to: 'TODO', // child 1 — passes
                            },
                        ],
                    },
                    actionId: 'test-sync-action',
                    inputs: { value: 'split-run' },
                },
                'TASK',
                taskId,
                'actor-1',
                'trace-split-1',
                undefined,
                cursor,
            );

            expect(result).toBe(true); // action was executed
        });

        it('should return false when resumed condition child still fails', async () => {
            // Both children would fail — even splitting from child 1 should return false.
            const cursor: StepResumeCursor = { conditionChildIndex: 1 };

            const result = await executeAutoActionStep(
                {
                    type: 'condition_action',
                    condition: {
                        type: 'logical',
                        operator: 'AND',
                        children: [
                            {
                                type: 'TaskFieldChangedTo',
                                field: 'status',
                                to: 'DONE', // child 0 — skipped
                            },
                            {
                                type: 'TaskFieldChangedTo',
                                field: 'status',
                                to: 'IN_PROGRESS', // child 1 — fails (status is TODO)
                            },
                        ],
                    },
                    actionId: 'test-sync-action',
                    inputs: { value: 'split-run' },
                },
                'TASK',
                taskId,
                'actor-1',
                'trace-split-2',
                undefined,
                cursor,
            );

            expect(result).toBe(false); // skipped — condition not met
        });

        it('should ignore conditionChildIndex for non-AND logical nodes', async () => {
            // OR node — conditionChildIndex is ignored, full OR is evaluated.
            // Child 0: status === 'DONE' → fails.
            // Child 1: status === 'TODO' → passes.
            // OR result: true.
            const cursor: StepResumeCursor = { conditionChildIndex: 2 }; // index out of range for OR — should be ignored

            const result = await executeAutoActionStep(
                {
                    type: 'condition_action',
                    condition: {
                        type: 'logical',
                        operator: 'OR',
                        children: [
                            {
                                type: 'TaskFieldChangedTo',
                                field: 'status',
                                to: 'DONE',
                            },
                            {
                                type: 'TaskFieldChangedTo',
                                field: 'status',
                                to: 'TODO',
                            },
                        ],
                    },
                    actionId: 'test-sync-action',
                    inputs: { value: 'split-or-run' },
                },
                'TASK',
                taskId,
                'actor-1',
                'trace-split-3',
                undefined,
                cursor,
            );

            expect(result).toBe(true); // OR passes because child 1 is TODO
        });

        it('should pipeline correctly resume a condition_action step with a startCursor', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') && sql.includes('auto_action')) {
                    return {
                        rows: [
                            {
                                id: 'action-uuid-cursor',
                                fk_project_id: 'proj-1',
                                name: 'Cursor Flow',
                                is_active: true,
                                steps: JSON.stringify([
                                    {
                                        type: 'condition_action',
                                        condition: {
                                            type: 'logical',
                                            operator: 'AND',
                                            children: [
                                                {
                                                    type: 'TaskFieldChangedTo',
                                                    field: 'status',
                                                    to: 'DONE', // child 0 — skipped by cursor
                                                },
                                                {
                                                    type: 'TaskFieldChangedTo',
                                                    field: 'status',
                                                    to: 'TODO', // child 1 — passes
                                                },
                                            ],
                                        },
                                        actionId: 'test-sync-action',
                                        inputs: { value: 'cursor-step' },
                                    },
                                ]),
                                triggers: '[]',
                                version: 1,
                            },
                        ],
                    };
                }
                if (sql.includes('select') && sql.includes('project_task')) {
                    return { rows: [taskRowMock] };
                }
                return { rows: [] };
            });

            const result = await executeAutoActionPipeline(
                'action-uuid-cursor',
                taskId,
                'actor-1',
                'trace-cursor',
                undefined,
                0, // startIndex 0 — begin at first step
                { conditionChildIndex: 1 }, // resume condition from child 1
            );

            expect(result.completed).toBe(true);
            expect(result.lastProcessedIndex).toBe(0);
        });
    });

    describe('Template - Dynamic Catalog Rendering', () => {
        it('should return correct schema types and filter asynchronous definitions', () => {
            // When isSync is false, returns all registered templates
            const fullTemplate = getTemplateForScope(EntityScope.TASK, false);
            expect(fullTemplate.triggers).toHaveLength(2);
            expect(fullTemplate.contextFields).toContain('taskId');
            expect(
                fullTemplate.actions.some((a) => a.id === 'test-async-action'),
            ).toBe(true);

            // When isSync is true, asynchronous definitions are filtered out!
            const syncTemplate = getTemplateForScope(EntityScope.TASK, true);
            expect(
                syncTemplate.actions.some((a) => a.id === 'test-async-action'),
            ).toBe(false);
            expect(
                syncTemplate.actions.some((a) => a.id === 'test-sync-action'),
            ).toBe(true);

            // Assert exact JSON Schema mappings
            const syncActionSchema = syncTemplate.actions.find(
                (a) => a.id === 'test-sync-action',
            );
            expect(syncActionSchema).toBeDefined();
            expect(syncActionSchema?.inputSchema).toEqual({
                type: 'object',
                properties: {
                    value: { type: 'string' },
                },
                required: ['value'],
            });
        });
    });
});
