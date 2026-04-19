import * as userLoaders from './user';
import * as projectLoaders from './project';
import * as teamLoaders from './team';
import * as taskLoaders from './task';

/**
 * Aggregates and creates all DataLoaders for a given request context.
 */
export const createLoaders = (_userId?: string) => {
    return {
        user: {
            byId: userLoaders.byId(),
        },
        project: {
            byId: projectLoaders.byId(),
            byActorIdAndProjectId: projectLoaders.byActorIdAndProjectId(),
        },
        team: {
            byId: teamLoaders.byId(),
        },
        task: {
            byId: taskLoaders.byId(),
        },
    };
};

export type DataLoaders = ReturnType<typeof createLoaders>;
