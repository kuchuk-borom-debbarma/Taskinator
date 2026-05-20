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

import {
    autoActionRegistry,
    EntityScope,
    init,
    sendInternalNotificationAction,
    setTaskStatusAction,
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
            expect(actions.map((a) => a.id)).toContain('set-task-status');
            expect(actions.map((a) => a.id)).toContain(
                'send-internal-notification',
            );
        });

        it('should return a rich metadata template for the TASK scope', () => {
            const template = autoActionRegistry.getTemplateForScope(
                EntityScope.TASK,
            );

            expect(template.scope).toBe(EntityScope.TASK);
            expect(template.triggers.map((t) => t.id)).toContain(
                'task.created',
            );
            expect(template.triggers.map((t) => t.id)).toContain(
                'task.updated',
            );

            const setStatusMetadata = template.actions.find(
                (a) => a.id === 'set-task-status',
            );
            expect(setStatusMetadata).toBeDefined();
            expect(setStatusMetadata?.inputs.newStatus).toEqual({
                type: 'string',
                required: true,
            });

            const sendNotificationMetadata = template.actions.find(
                (a) => a.id === 'send-internal-notification',
            );
            expect(sendNotificationMetadata).toBeDefined();
            expect(sendNotificationMetadata?.inputs.userId).toEqual({
                type: 'string',
                required: true,
            });

            expect(template.contextFields).toContain('taskId');
            expect(template.contextFields).toContain('prev_status');
            expect(template.contextFields).toContain('current_status');
        });
    });

    describe('SetTaskStatus Action', () => {
        it('should fetch fresh task, update status and version using optimistic locking', async () => {
            // Mock DB response for select query (fetching fresh task) and update query
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

            await setTaskStatusAction.handler(ctx, {
                newStatus: 'IN_PROGRESS',
            });

            // Check if select query was called with correct parameters
            const selectCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('select') ||
                    call[0].sql.includes('SELECT'),
            );
            expect(selectCall).toBeDefined();
            expect(selectCall?.[0].parameters).toContain('task-uuid-1');

            // Check if update query was executed with optimistic locking criteria (WHERE version = 3, SET version = 4)
            const updateCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('update') ||
                    call[0].sql.includes('UPDATE'),
            );
            expect(updateCall).toBeDefined();
            expect(updateCall?.[0].parameters).toContain('IN_PROGRESS');
            expect(updateCall?.[0].parameters).toContain(4); // New version
            expect(updateCall?.[0].parameters).toContain(3); // Old version in WHERE clause
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
                        numAffectedRows: 0n, // Concurrent modification occurred
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
                setTaskStatusAction.handler(ctx, { newStatus: 'IN_PROGRESS' }),
            ).rejects.toThrow('Optimistic lock failure');
        });
    });

    describe('SendInternalNotification Action', () => {
        it('should correctly insert a notification record into the database', async () => {
            executeSpy.mockImplementation(async () => {
                return {
                    numUpdatedRows: 1n,
                    numAffectedRows: 1n,
                    rows: [],
                };
            });

            const ctx = {
                traceId: 'trace-456',
                scope: EntityScope.TASK as const,
                actorId: 'user-1',
                taskId: 'task-uuid-1',
                projectId: 'project-1',
            };

            await sendInternalNotificationAction.handler(ctx, {
                userId: 'user-2',
                title: 'Automation Triggered',
                message: 'Your task has been updated.',
            });

            const insertCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('insert') ||
                    call[0].sql.includes('INSERT'),
            );
            expect(insertCall).toBeDefined();

            const params = insertCall?.[0].parameters;
            expect(params).toContain('user-2');
            expect(params).toContain('Automation Triggered');
            expect(params).toContain('Your task has been updated.');
            expect(params).toContain('AUTOMATION');

            // Verifying JSON metadata carries traceId and taskId
            const metadataStr = params.find(
                (p: any) => typeof p === 'string' && p.includes('trace-456'),
            );
            expect(metadataStr).toBeDefined();
            const parsedMeta = JSON.parse(metadataStr);
            expect(parsedMeta.traceId).toBe('trace-456');
            expect(parsedMeta.triggeringTaskId).toBe('task-uuid-1');
        });
    });
});
