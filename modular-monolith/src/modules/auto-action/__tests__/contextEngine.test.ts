import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { z } from 'zod';
import { db } from '../../../database/index.js';
import type { ContextResolver } from '../contextEngine.js';
import {
    actionRegistry,
    conditionRegistry,
    contextResolverRegistry,
    fetchContext,
    init,
} from '../index.js';

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

describe('Auto Action Module - Context Engine', () => {
    let originalExecuteQuery: any;

    beforeEach(async () => {
        executeSpy.mockClear();
        const executor = db.getExecutor();
        originalExecuteQuery = executor.executeQuery;
        executor.executeQuery = executeSpy;

        // Reset all registries before each test to start with a fresh registration
        conditionRegistry.clear();
        actionRegistry.clear();
        contextResolverRegistry.clear();
        await init();
    });

    afterEach(() => {
        db.getExecutor().executeQuery = originalExecuteQuery;
    });

    describe('ContextResolverRegistry', () => {
        it('should correctly register task context resolver on initialization', () => {
            const resolver = contextResolverRegistry.getResolver('TASK');
            expect(resolver).toBeDefined();
            expect(resolver.scope).toBe('TASK');
        });

        it('should throw error when registering a duplicate resolver for the same scope', () => {
            const firstResolver = contextResolverRegistry.getResolver('TASK');
            expect(() => {
                contextResolverRegistry.registerResolver(firstResolver);
            }).toThrow(/Duplicate resolver registered/);
        });

        it('should throw error when requesting a resolver for an unregistered scope', () => {
            expect(() => {
                contextResolverRegistry.getResolver('UNREGISTERED_SCOPE');
            }).toThrow(/No context resolver found for scope/);
        });

        it('should support manual registration of custom resolvers', async () => {
            const mockSchema = z.object({
                scope: z.literal('CUSTOM'),
                customField: z.string(),
            });

            const customResolver: ContextResolver<z.infer<typeof mockSchema>> =
                {
                    scope: 'CUSTOM',
                    schema: mockSchema,
                    async resolve(entityId, actorId, traceId, wasSnapshot) {
                        return {
                            scope: 'CUSTOM',
                            customField: `custom-${entityId}`,
                        };
                    },
                };

            contextResolverRegistry.registerResolver(customResolver);
            const resolver = contextResolverRegistry.getResolver('CUSTOM');
            expect(resolver).toBeDefined();

            const context = await fetchContext(
                'CUSTOM',
                '123',
                'actor-1',
                'trace-1',
            );
            expect(context).toEqual({
                scope: 'CUSTOM',
                customField: 'custom-123',
            });
        });
    });

    describe('fetchContext - TASK Scope Resolution', () => {
        const actorId = 'user-1';
        const traceId = 'trace-uuid-1';
        const taskId = 'task-uuid-1';

        it('should resolve and validate task context from live database state without snapshot', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                const sql = query.sql;
                if (sql.includes('select') || sql.includes('SELECT')) {
                    return {
                        rows: [
                            {
                                id: taskId,
                                fk_project_id: 'project-uuid-1',
                                fk_team_id: 'team-uuid-1',
                                fk_member_id: 'member-uuid-1',
                                title: 'Database Migration',
                                status: 'TODO',
                                priority: 2,
                                version: 3,
                                // No prior update — prev_ columns are null in DB
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

            const context = await fetchContext(
                'TASK',
                taskId,
                actorId,
                traceId,
            );

            // Assert exact returned shape
            expect(context).toEqual({
                traceId,
                scope: 'TASK',
                actorId,
                taskId,
                projectId: 'project-uuid-1',
                prev_status: null,
                prev_priority: null,
                prev_title: null,
                prev_team_id: null,
                prev_member_id: null,
                prev_version: null,
                current_status: 'TODO',
                current_priority: 2,
                current_title: 'Database Migration',
                current_team_id: 'team-uuid-1',
                current_member_id: 'member-uuid-1',
                current_version: 3,
            });

            // Assert DB query details
            const selectCall = executeSpy.mock.calls.find(
                (call) =>
                    call[0].sql.includes('select') ||
                    call[0].sql.includes('SELECT'),
            );
            expect(selectCall).toBeDefined();
            expect(selectCall?.[0].parameters).toContain(taskId);
        });

        it('should use wasSnapshot as fallback for prev_ when DB columns are null (initial trigger)', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                return {
                    rows: [
                        {
                            id: taskId,
                            fk_project_id: 'project-uuid-1',
                            fk_team_id: 'team-uuid-2',
                            fk_member_id: 'member-uuid-2',
                            title: 'Updated title',
                            status: 'IN_PROGRESS',
                            priority: 1,
                            version: 4,
                            // DB prev_ are null — first-ever trigger, no prior update
                            prev_status: null,
                            prev_priority: null,
                            prev_title: null,
                            prev_team_id: null,
                            prev_member_id: null,
                        },
                    ],
                };
            });

            // wasSnapshot carries the original event payload (db column names)
            const wasSnapshot = {
                status: 'TODO',
                priority: 2,
                title: 'Database Migration',
                fk_team_id: 'team-uuid-1',
                fk_member_id: 'member-uuid-1',
                version: 3,
            };

            const context = await fetchContext(
                'TASK',
                taskId,
                actorId,
                traceId,
                wasSnapshot,
            );

            // DB prev_ columns were null → should fall through to wasSnapshot
            expect(context.prev_status).toBe('TODO');
            expect(context.prev_priority).toBe(2);
            expect(context.prev_title).toBe('Database Migration');
            expect(context.prev_team_id).toBe('team-uuid-1');
            expect(context.prev_member_id).toBe('member-uuid-1');
            expect(context.prev_version).toBe(3);

            expect(context.current_status).toBe('IN_PROGRESS');
            expect(context.current_priority).toBe(1);
            expect(context.current_title).toBe('Updated title');
            expect(context.current_team_id).toBe('team-uuid-2');
            expect(context.current_member_id).toBe('member-uuid-2');
            expect(context.current_version).toBe(4);
        });

        it('should prefer DB prev_ columns over wasSnapshot when both are present', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                return {
                    rows: [
                        {
                            id: taskId,
                            fk_project_id: 'project-uuid-1',
                            fk_team_id: 'team-uuid-3',
                            fk_member_id: 'member-uuid-3',
                            title: 'Step 2 title',
                            status: 'DONE',
                            priority: 0,
                            version: 5,
                            // DB has prev_ values written by Step 1's update
                            prev_status: 'IN_PROGRESS',
                            prev_priority: 1,
                            prev_title: 'Updated title',
                            prev_team_id: 'team-uuid-2',
                            prev_member_id: 'member-uuid-2',
                        },
                    ],
                };
            });

            // wasSnapshot is the original event payload — stale compared to DB
            const wasSnapshot = {
                status: 'TODO',
                priority: 2,
                title: 'Database Migration',
                fk_team_id: 'team-uuid-1',
                fk_member_id: 'member-uuid-1',
                version: 3,
            };

            const context = await fetchContext(
                'TASK',
                taskId,
                actorId,
                traceId,
                wasSnapshot,
            );

            // DB prev_ columns should win — they represent the most recent transition
            expect(context.prev_status).toBe('IN_PROGRESS');
            expect(context.prev_priority).toBe(1);
            expect(context.prev_title).toBe('Updated title');
            expect(context.prev_team_id).toBe('team-uuid-2');
            expect(context.prev_member_id).toBe('member-uuid-2');

            expect(context.current_status).toBe('DONE');
            expect(context.current_priority).toBe(0);
        });

        it('should map camelCase wasSnapshot fields to prev_ properties when DB columns are null', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                return {
                    rows: [
                        {
                            id: taskId,
                            fk_project_id: 'project-uuid-1',
                            fk_team_id: 'team-uuid-1',
                            fk_member_id: 'member-uuid-1',
                            title: 'Migration',
                            status: 'DONE',
                            priority: 1,
                            version: 5,
                            // DB prev_ are null — fall through to wasSnapshot
                            prev_status: null,
                            prev_priority: null,
                            prev_title: null,
                            prev_team_id: null,
                            prev_member_id: null,
                        },
                    ],
                };
            });

            // wasSnapshot has camelCase fields (legacy event payload format)
            const wasSnapshot = {
                teamId: 'team-uuid-old',
                memberId: 'member-uuid-old',
            };

            const context = await fetchContext(
                'TASK',
                taskId,
                actorId,
                traceId,
                wasSnapshot,
            );

            expect(context.prev_team_id).toBe('team-uuid-old');
            expect(context.prev_member_id).toBe('member-uuid-old');
        });

        it('should fallback to explicit prev_ keys in wasSnapshot when DB columns are null', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                return {
                    rows: [
                        {
                            id: taskId,
                            fk_project_id: 'project-uuid-1',
                            fk_team_id: 'team-uuid-1',
                            fk_member_id: 'member-uuid-1',
                            title: 'Migration',
                            status: 'DONE',
                            priority: 1,
                            version: 5,
                            // DB prev_ are null — fall through to wasSnapshot
                            prev_status: null,
                            prev_priority: null,
                            prev_title: null,
                            prev_team_id: null,
                            prev_member_id: null,
                        },
                    ],
                };
            });

            // wasSnapshot has explicit prev_ fields
            const wasSnapshot = {
                prev_status: 'TODO',
                prev_priority: 3,
            };

            const context = await fetchContext(
                'TASK',
                taskId,
                actorId,
                traceId,
                wasSnapshot,
            );

            expect(context.prev_status).toBe('TODO');
            expect(context.prev_priority).toBe(3);
        });

        it('should throw error if task is not found in database', async () => {
            executeSpy.mockImplementation(async () => {
                return { rows: [] }; // No task returned
            });

            await expect(
                fetchContext('TASK', taskId, actorId, traceId),
            ).rejects.toThrow(/Task with ID "task-uuid-1" not found/);
        });

        it('should fail validation and throw error if database returns invalid column types', async () => {
            executeSpy.mockImplementation(async (query: any) => {
                return {
                    rows: [
                        {
                            id: taskId,
                            fk_project_id: 'project-uuid-1',
                            fk_team_id: 12345, // Invalid type: expected string, returned number
                            fk_member_id: 'member-uuid-1',
                            title: 'Invalid Test',
                            status: 'TODO',
                            priority: 'HIGH', // Invalid type: expected number, returned string
                            version: 3,
                            prev_status: null,
                            prev_priority: null,
                            prev_title: null,
                            prev_team_id: null,
                            prev_member_id: null,
                        },
                    ],
                };
            });

            await expect(
                fetchContext('TASK', taskId, actorId, traceId),
            ).rejects.toThrow(/Context validation failed for scope "TASK"/);
        });
    });
});
