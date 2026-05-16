import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/index.ts';
import { autopilotQueryService } from '../../modules/autopilot/index.ts';
import type { AutopilotWithActions } from '../../modules/autopilot/internal/AutopilotQueryService.ts';
import type { PaginationParams } from '../../types/pagination.ts';
import { encodeCursor } from '../../utils/utils.ts';
import type { GraphQLContext } from '../context.ts';
import {
    MutationFailedError,
    NotFoundError,
    UnauthorizedError,
} from '../errors.ts';

interface CreateAutopilotInput {
    projectId: string;
    triggers: string[];
    conditions: any;
    actions: {
        type: string;
        config: any;
        position: number;
    }[];
}

export const autopilotResolvers = {
    Autopilot: {
        id: (parent: AutopilotWithActions) => parent.id,
        fk_project_id: (parent: AutopilotWithActions) => parent.fk_project_id,
        triggers: () => [],
        conditions: () => ({}),
        isActive: (parent: AutopilotWithActions) => parent.is_active,
        actions: () => [],
        createdAt: (parent: AutopilotWithActions) =>
            parent.created_at.toISOString(),
        version: (parent: AutopilotWithActions) => parent.version,
    },

    AutopilotAction: {
        id: () => '',
        type: () => '',
        config: () => '',
        position: () => 0,
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

    Mutation: {
        createAutopilot: async (
            _parent: any,
            { input }: { input: CreateAutopilotInput },
            context: GraphQLContext,
        ): Promise<AutopilotWithActions> => {
            if (!context.userId) throw new UnauthorizedError();

            const autopilotId = uuidv4();

            try {
                await db.transaction().execute(async (trx) => {
                    // 1. Insert Autopilot main record
                    await trx
                        .insertInto('autopilot')
                        .values({
                            id: autopilotId,
                            fk_project_id: input.projectId,
                            name: 'New Autopilot',
                            description: null,
                            steps: JSON.stringify([]),
                            created_by: context.userId as string,
                            updated_by: context.userId as string,
                            is_active: true,
                            version: 1,
                            trace_history_enabled: false,
                        })
                        .execute();
                });

                const created =
                    await autopilotQueryService.getAutopilotById(autopilotId);
                if (!created) {
                    throw new MutationFailedError(
                        'Autopilot created but failed to retrieve',
                    );
                }
                return created;
            } catch (error: any) {
                throw new MutationFailedError(error.message);
            }
        },

        toggleAutopilot: async (
            _parent: any,
            { id, isActive }: { id: string; isActive: boolean },
            context: GraphQLContext,
        ): Promise<AutopilotWithActions> => {
            if (!context.userId) throw new UnauthorizedError();

            const result = await db
                .updateTable('autopilot')
                .set({
                    is_active: isActive,
                    version: sql`version + 1`,
                })
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirst();

            if (!result) {
                throw new NotFoundError(`Autopilot with ID ${id} not found`);
            }

            const updated = await autopilotQueryService.getAutopilotById(id);
            if (!updated) {
                throw new NotFoundError(
                    `Autopilot actions not found for ID ${id}`,
                );
            }
            return updated;
        },
    },
};
