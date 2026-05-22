import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { db } from '../../../database/index.js';
import type { AutoAction } from '../../../database/tables/AutoAction.js';

const loggerMock = {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
};

const getProjectsByActorIdAndProjectIdsMock = mock(async () => [
    { id: 'project-1' },
]);

mock.module(import.meta.resolve('../../../logger/index.ts'), () => ({
    logger: loggerMock,
}));

mock.module(import.meta.resolve('../../project/index.ts'), () => ({
    projectService: {
        getProjectsByActorIdAndProjectIds:
            getProjectsByActorIdAndProjectIdsMock,
    },
}));

const { autoActionService } = await import('../index.ts');
const { AutoActionServiceImpl } = await import(
    '../internal/service/AutoActionServiceImpl.ts'
);
const { autoActionResolvers } = await import(
    '../../../graphql/resolvers/autoAction.ts'
);
const autoActionLoaders = await import('../../../graphql/dls/autoAction.ts');

const originalExecuteQuery = db.getExecutor().executeQuery;
const originalMethods = {
    getAutoActionsByIds: autoActionService.getAutoActionsByIds,
    getAutoActionsForActorByIds: autoActionService.getAutoActionsForActorByIds,
    getAutoActionsForProjectConnection:
        autoActionService.getAutoActionsForProjectConnection,
    createAutoActionForActor: autoActionService.createAutoActionForActor,
    updateAutoActionForActor: autoActionService.updateAutoActionForActor,
};

const executeQueryMock = mock(
    async (): Promise<{ rows: any[] }> => ({
        rows: [],
    }),
);

function createAutoAction(overrides: Partial<AutoAction> = {}): AutoAction {
    return {
        id: 'auto-action-1',
        fk_project_id: 'project-1',
        name: 'Move task',
        description: null,
        triggers: [{ type: 'task.updated', scope: 'TASK' }],
        steps: [{ action: 'task.update' }],
        is_active: true,
        is_sync: true,
        version: 1,
        created_at: new Date('2026-05-22T00:00:00.000Z'),
        updated_at: new Date('2026-05-22T00:00:00.000Z'),
        created_by: 'user-1',
        updated_by: 'user-2',
        ...overrides,
    };
}

function createContext(overrides: Record<string, any> = {}) {
    return {
        userId: 'user-1',
        loaders: {
            autoAction: {
                byActorIdAndId: {
                    load: mock(async () => createAutoAction()),
                },
            },
            project: {
                byActorIdAndId: {
                    load: mock(async () => ({ id: 'project-1' })),
                },
            },
            user: {
                byId: {
                    load: mock(async (id: string) => ({ id })),
                },
            },
        },
        ...overrides,
    } as any;
}

describe('AutoAction GraphQL API wiring', () => {
    beforeEach(() => {
        executeQueryMock.mockClear();
        getProjectsByActorIdAndProjectIdsMock.mockClear();
        db.getExecutor().executeQuery = executeQueryMock as any;

        autoActionService.getAutoActionsByIds =
            originalMethods.getAutoActionsByIds;
        autoActionService.getAutoActionsForActorByIds =
            originalMethods.getAutoActionsForActorByIds;
        autoActionService.getAutoActionsForProjectConnection =
            originalMethods.getAutoActionsForProjectConnection;
        autoActionService.createAutoActionForActor =
            originalMethods.createAutoActionForActor;
        autoActionService.updateAutoActionForActor =
            originalMethods.updateAutoActionForActor;
    });

    afterEach(() => {
        db.getExecutor().executeQuery = originalExecuteQuery;
        autoActionService.getAutoActionsByIds =
            originalMethods.getAutoActionsByIds;
        autoActionService.getAutoActionsForActorByIds =
            originalMethods.getAutoActionsForActorByIds;
        autoActionService.getAutoActionsForProjectConnection =
            originalMethods.getAutoActionsForProjectConnection;
        autoActionService.createAutoActionForActor =
            originalMethods.createAutoActionForActor;
        autoActionService.updateAutoActionForActor =
            originalMethods.updateAutoActionForActor;
    });

    it('delegates single auto-action query to auth-aware DataLoader', async () => {
        const context = createContext();

        await autoActionResolvers.Query.autoAction(
            null,
            { id: 'auto-action-1' },
            context,
        );

        expect(
            context.loaders.autoAction.byActorIdAndId.load,
        ).toHaveBeenCalledWith({
            actorId: 'user-1',
            id: 'auto-action-1',
        });
    });

    it('returns connection pagination from service for list query', async () => {
        const getConnectionMock = mock(async () => ({
            edges: [
                {
                    node: createAutoAction(),
                    cursor: 'cursor-1',
                },
            ],
            pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
            },
            totalCount: 1,
        }));
        autoActionService.getAutoActionsForProjectConnection =
            getConnectionMock as any;

        const result = await autoActionResolvers.Query.autoActions(
            null,
            { projectId: 'project-1', first: 10 },
            createContext(),
        );

        expect(getConnectionMock).toHaveBeenCalledWith('user-1', 'project-1', {
            first: 10,
        });
        expect(result.edges).toHaveLength(1);
        expect(result.pageInfo).toEqual({
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
        });
        expect(result.totalCount).toBe(1);
    });

    it('delegates create and update mutations to service with actor context', async () => {
        const createMock = mock(async () => createAutoAction());
        const updateMock = mock(async () =>
            createAutoAction({ name: 'Updated' }),
        );
        autoActionService.createAutoActionForActor = createMock as any;
        autoActionService.updateAutoActionForActor = updateMock as any;

        await autoActionResolvers.Mutation.createAutoAction(
            null,
            {
                input: {
                    projectId: 'project-1',
                    name: 'Rule',
                    triggers: [],
                    steps: [],
                },
            },
            createContext(),
        );
        await autoActionResolvers.Mutation.updateAutoAction(
            null,
            {
                id: 'auto-action-1',
                version: 1,
                input: { name: 'Updated' },
            },
            createContext(),
        );

        expect(createMock).toHaveBeenCalledWith('user-1', {
            projectId: 'project-1',
            name: 'Rule',
            triggers: [],
            steps: [],
        });
        expect(updateMock).toHaveBeenCalledWith('user-1', 'auto-action-1', 1, {
            name: 'Updated',
        });
    });

    it('loads nested project and users through DataLoader', async () => {
        const context = createContext();
        const autoAction = createAutoAction();

        await autoActionResolvers.AutoAction.project(autoAction, null, context);
        await autoActionResolvers.AutoAction.createdBy(
            autoAction,
            null,
            context,
        );
        await autoActionResolvers.AutoAction.updatedBy(
            autoAction,
            null,
            context,
        );

        expect(
            context.loaders.project.byActorIdAndId.load,
        ).toHaveBeenCalledWith({
            actorId: 'user-1',
            id: 'project-1',
        });
        expect(context.loaders.user.byId.load).toHaveBeenCalledWith('user-1');
        expect(context.loaders.user.byId.load).toHaveBeenCalledWith('user-2');
    });

    it('batches auth-aware DataLoader keys by actor and preserves order', async () => {
        const first = createAutoAction({ id: 'auto-action-1' });
        const second = createAutoAction({ id: 'auto-action-2' });
        const batchMock = mock(async () => [second, first]);
        autoActionService.getAutoActionsForActorByIds = batchMock as any;

        const loader = autoActionLoaders.byActorIdAndId();
        const results = await Promise.all([
            loader.load({ actorId: 'user-1', id: 'auto-action-1' }),
            loader.load({ actorId: 'user-1', id: 'auto-action-2' }),
        ]);

        expect(batchMock).toHaveBeenCalledWith('user-1', [
            'auto-action-1',
            'auto-action-2',
        ]);
        expect(results).toEqual([first, second]);
    });

    it('builds stable cursors and total metadata for service pagination', async () => {
        const service = new AutoActionServiceImpl();
        const autoAction = createAutoAction();

        executeQueryMock
            .mockResolvedValueOnce({ rows: [{ count: '1' }] })
            .mockResolvedValueOnce({
                rows: [
                    {
                        ...autoAction,
                        epochPrecision: '2026-05-22 00:00:00+00',
                    },
                ],
            });

        const result = await service.getAutoActionsForProjectConnection(
            'user-1',
            'project-1',
            { first: 10 },
        );

        expect(getProjectsByActorIdAndProjectIdsMock).toHaveBeenCalledWith(
            'user-1',
            ['project-1'],
        );
        expect(result.edges).toHaveLength(1);
        expect(result.edges[0]?.node.id).toBe('auto-action-1');
        expect(result.edges[0]?.cursor).toBeTruthy();
        expect(result.totalCount).toBe(1);
        expect(result.pageInfo).toEqual({
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
        });
    });
});
