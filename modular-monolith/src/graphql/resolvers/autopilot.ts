import type { AutopilotAction } from '../../database/tables/AutopilotAction.ts';
import { autopilotQueryService } from '../../modules/autopilot/index.ts';
import type { AutopilotWithActions } from '../../modules/autopilot/internal/AutopilotQueryService.ts';
import type { PaginationParams } from '../../types/pagination.ts';
import { encodeCursor } from '../../utils/utils.ts';
import type { GraphQLContext } from '../context.ts';
import { UnauthorizedError } from '../errors.ts';

export const autopilotResolvers = {
    Autopilot: {
        id: (parent: AutopilotWithActions) => parent.id,
        fk_project_id: (parent: AutopilotWithActions) => parent.fk_project_id,
        triggers: (parent: AutopilotWithActions) => parent.triggers,
        conditions: (parent: AutopilotWithActions) => parent.conditions,
        isActive: (parent: AutopilotWithActions) => parent.is_active,
        actions: (parent: AutopilotWithActions) => parent.actions,
        createdAt: (parent: AutopilotWithActions) =>
            parent.created_at.toISOString(),
        version: (parent: AutopilotWithActions) => parent.version,
    },

    AutopilotAction: {
        id: (parent: AutopilotAction) => parent.id,
        type: (parent: AutopilotAction) => parent.type,
        config: (parent: AutopilotAction) => parent.config,
        position: (parent: AutopilotAction) => parent.position,
    },

    AutopilotConnection: {
        totalCount: (parent: { totalCount: number }) => parent.totalCount,
    },

    Query: {
        autopilots: async (
            _parent: any,
            {
                projectId,
                ...paginationArgs
            }: { projectId: string } & PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { autopilots, totalCount, nextCursor, prevCursor } =
                await autopilotQueryService.getAutopilotsByProject(
                    projectId,
                    paginationArgs,
                );

            return {
                edges: autopilots.map((a: AutopilotWithActions) => ({
                    node: a,
                    cursor: encodeCursor(a.created_at.toISOString(), a.id),
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
                totalCount,
            };
        },
    },
};
