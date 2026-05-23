import * as projectLoaders from './project';
import * as projectMemberLoaders from './projectMember';
import * as taskLoaders from './task';
import * as teamLoaders from './team';
import * as userLoaders from './user';

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
            byActorIdAndId: projectLoaders.byActorIdAndId(),
        },
        team: {
            byId: teamLoaders.byId(),
            byActorIdAndId: teamLoaders.byActorIdAndId(),
        },
        task: {
            byId: taskLoaders.byId(),
            byActorIdAndId: taskLoaders.byActorIdAndId(),
        },
        projectMember: {
            byId: projectMemberLoaders.byId(),
            byActorIdAndId: projectMemberLoaders.byActorIdAndId(),
        },
    };
};

export type DataLoaders = ReturnType<typeof createLoaders>;
