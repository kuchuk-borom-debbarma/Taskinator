import type { AutoAction } from '../../database/tables/AutoAction.ts';
import { autoActionService } from '../../modules/auto-action';
import type { PaginationParams } from '../../types/pagination.ts';
import type { GraphQLContext } from '../context.ts';
import {
    ForbiddenError,
    MutationFailedError,
    NotFoundError,
    UnauthorizedError,
} from '../errors.ts';

type CreateAutoActionArgs = {
    input: {
        projectId: string;
        name?: string;
        description?: string | null;
        triggers: any[];
        steps: any[];
        isActive?: boolean;
        isSync?: boolean;
    };
};

type UpdateAutoActionArgs = {
    id: string;
    version: number;
    input: {
        name?: string;
        description?: string | null;
        triggers?: any[];
        steps?: any[];
        isActive?: boolean;
        isSync?: boolean;
    };
};

function requireUserId(context: GraphQLContext): string {
    if (!context.userId) {
        throw new UnauthorizedError('userId not found in context.');
    }
    return context.userId;
}

function mapMutationError(error: unknown, fallback: string): never {
    const message = error instanceof Error ? error.message : fallback;
    if (message.includes('not authorized')) {
        throw new ForbiddenError(message);
    }
    if (message.includes('not found')) {
        throw new NotFoundError(message);
    }
    throw new MutationFailedError(message);
}

export const autoActionResolvers = {
    AutoAction: {
        id: (parent: AutoAction) => parent.id,
        project: (parent: AutoAction, _args: any, context: GraphQLContext) => {
            const actorId = requireUserId(context);
            return context.loaders.project.byActorIdAndId.load({
                actorId,
                id: parent.fk_project_id,
            });
        },
        name: (parent: AutoAction) => parent.name,
        description: (parent: AutoAction) => parent.description,
        triggers: (parent: AutoAction) => parent.triggers,
        steps: (parent: AutoAction) => parent.steps,
        isActive: (parent: AutoAction) => parent.is_active,
        isSync: (parent: AutoAction) => parent.is_sync,
        version: (parent: AutoAction) => parent.version,
        createdAt: (parent: AutoAction) => parent.created_at.toISOString(),
        updatedAt: (parent: AutoAction) =>
            parent.updated_at?.toISOString() || null,
        createdBy: (parent: AutoAction, _args: any, context: GraphQLContext) =>
            context.loaders.user.byId.load(parent.created_by),
        updatedBy: (parent: AutoAction, _args: any, context: GraphQLContext) =>
            context.loaders.user.byId.load(parent.updated_by),
    },

    AutoActionConnection: {
        totalCount: (parent: { totalCount?: number }) => parent.totalCount || 0,
    },

    Query: {
        autoAction: (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            const actorId = requireUserId(context);
            return context.loaders.autoAction.byActorIdAndId.load({
                actorId,
                id,
            });
        },
        autoActions: async (
            _parent: any,
            {
                projectId,
                ...pagination
            }: PaginationParams & { projectId: string },
            context: GraphQLContext,
        ) => {
            const actorId = requireUserId(context);
            return autoActionService.getAutoActionsForProjectConnection(
                actorId,
                projectId,
                pagination,
            );
        },
    },

    Mutation: {
        createAutoAction: async (
            _parent: any,
            { input }: CreateAutoActionArgs,
            context: GraphQLContext,
        ) => {
            const actorId = requireUserId(context);
            try {
                return await autoActionService.createAutoActionForActor(
                    actorId,
                    input,
                );
            } catch (error) {
                mapMutationError(error, 'Failed to create auto action.');
            }
        },
        updateAutoAction: async (
            _parent: any,
            { id, version, input }: UpdateAutoActionArgs,
            context: GraphQLContext,
        ) => {
            const actorId = requireUserId(context);
            try {
                return await autoActionService.updateAutoActionForActor(
                    actorId,
                    id,
                    version,
                    input,
                );
            } catch (error) {
                mapMutationError(error, 'Failed to update auto action.');
            }
        },
        deleteAutoAction: async (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            const actorId = requireUserId(context);
            let existing: AutoAction | undefined;
            try {
                existing = await autoActionService.getAutoActionForActor(
                    actorId,
                    id,
                );
            } catch (error) {
                mapMutationError(error, 'Failed to delete auto action.');
            }
            if (!existing) throw new NotFoundError('Auto action not found.');

            try {
                await autoActionService.deleteAutoActionForActor(actorId, id);
            } catch (error) {
                mapMutationError(error, 'Failed to delete auto action.');
            }
            return { success: true, deletedId: id };
        },
    },
};
