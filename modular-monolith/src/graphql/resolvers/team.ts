import type { GraphQLContext } from '../context.ts';
import type { Team, TeamMember } from '../../modules/team/TeamService.ts';
import type { Project } from '../../modules/project/ProjectService.ts';
import { NotFoundError, UnauthorizedError } from '../errors.ts';
import { teamService } from '../../modules/team';
import { taskService } from '../../modules/task';
import { encodeCursor } from '../../utils/utils.ts';
import type { PaginationParams } from '../../types/pagination.ts';

export const teamResolvers = {
    Team: {
        id: (parent: Team) => parent.id,
        name: (parent: Team) => parent.name,
        project: (parent: Team, _args: any, context: GraphQLContext) => {
            // Internal hydration — using trust-based byId
            return context.loaders.project.byId.load(parent.projectId);
        },
        members: async (
            parent: Team,
            args: PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { members, nextCursor, prevCursor } =
                await teamService.getTeamMembers(
                    context.userId,
                    parent.projectId,
                    parent.id,
                    args,
                );

            return {
                edges: members.map((m: any) => ({
                    node: m,
                    cursor: m.id,
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        tasks: async (
            parent: Team,
            args: PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { tasks, nextCursor, prevCursor } =
                await taskService.getTasks(context.userId, parent.projectId, {
                    ...args,
                    teamId: parent.id,
                });

            return {
                edges: tasks.map((t: any) => ({
                    node: t,
                    cursor: encodeCursor(
                        t.epochPrecision || t.createdAt.toISOString(),
                        t.id,
                    ),
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        createdBy: async (
            parent: Team,
            _args: any,
            context: GraphQLContext,
        ) => {
            const user = await context.loaders.user.byId.load(parent.createdBy);
            if (!user) {
                throw new NotFoundError(
                    `Creator User with ID ${parent.createdBy} not found for team ${parent.id}`,
                );
            }
            return user;
        },
        createdAt: (parent: Team) => parent.createdAt.toISOString(),
        updatedAt: (parent: Team) => parent.updatedAt?.toISOString() || null,
        version: (parent: Team) => parent.version,
        lastEventId: (parent: Team) => parent.lastEventId,
        membersCount: () => 0,
        tasksCount: () => 0,
    },

    TeamMember: {
        id: (parent: TeamMember) => parent.id,
        user: async (
            parent: TeamMember,
            _args: any,
            context: GraphQLContext,
        ) => {
            const user = await context.loaders.user.byId.load(parent.userId);
            if (!user) {
                throw new NotFoundError(
                    `User with ID ${parent.userId} not found for team member ${parent.id}`,
                );
            }
            return user;
        },
        team: async (
            parent: TeamMember,
            _args: any,
            context: GraphQLContext,
        ) => {
            // Authorized lookup for cross-domain link
            const team = await context.loaders.team.byActorIdAndId.load({
                actorId: context.userId || '',
                id: parent.teamId,
            });
            if (!team) {
                throw new NotFoundError(
                    `Team with ID ${parent.teamId} not found for member ${parent.id}`,
                );
            }
            return team;
        },
        createdAt: (parent: TeamMember) => parent.createdAt.toISOString(),
        version: (parent: TeamMember) => parent.version,
    },

    Project: {
        teams: async (
            parent: Project,
            args: PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { teams, nextCursor, prevCursor } =
                await teamService.getTeams(context.userId, parent.id, args);

            return {
                edges: teams.map((t: any) => ({
                    node: t,
                    cursor: t.id,
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
    },

    Query: {
        team: (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            return context.loaders.team.byActorIdAndId.load({
                actorId: context.userId || '',
                id: id,
            });
        },
        teams: async (
            _parent: any,
            { ids }: { ids?: string[] },
            context: GraphQLContext,
        ) => {
            if (!ids || ids.length === 0) return [];
            const actorId = context.userId || '';
            const results = await context.loaders.team.byActorIdAndId.loadMany(
                ids.map((id) => ({ actorId, id })),
            );
            return results.filter(
                (res): res is Team => res !== null && !(res instanceof Error),
            );
        },
        teamMembers: async (
            _parent: any,
            { projectId, teamId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { members, nextCursor, prevCursor } =
                await teamService.getTeamMembers(
                    context.userId,
                    projectId,
                    teamId,
                    { first, after, last, before },
                );

            return {
                edges: members.map((m: any) => ({
                    node: m,
                    cursor: m.id,
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
    },

    Mutation: {
        createTeam: async (
            _parent: any,
            { projectId, name }: { projectId: string; name: string },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const team = await teamService.createTeam({
                actorId: context.userId,
                projectId,
                name,
            });

            return {
                success: true,
                team,
            };
        },
        deleteTeams: async (
            _parent: any,
            { projectId, teamIds }: { projectId: string; teamIds: string[] },
            context: GraphQLContext,
        ) => {
            if (!context.userId) {
                return { success: false, deletedCount: 0 };
            }

            const { deletedCount } = await teamService.deleteTeams({
                actorId: context.userId,
                projectId,
                teamIds,
            });

            return {
                success: true,
                deletedCount,
            };
        },
        addTeamMembers: async (
            _parent: any,
            {
                projectId,
                teamId,
                userIds,
            }: { projectId: string; teamId: string; userIds: string[] },
            context: GraphQLContext,
        ) => {
            if (!context.userId) {
                throw new Error('Unauthorized');
            }

            const { addedCount } = await teamService.addTeamMembers({
                actorId: context.userId,
                projectId,
                teamId,
                userIds,
            });

            return {
                success: true,
                addedCount,
            };
        },
        removeTeamMembers: async (
            _parent: any,
            {
                projectId,
                teamId,
                userIds,
            }: { projectId: string; teamId: string; userIds: string[] },
            context: GraphQLContext,
        ) => {
            if (!context.userId) {
                throw new Error('Unauthorized');
            }

            const { removedCount } = await teamService.removeTeamMembers({
                actorId: context.userId,
                projectId,
                teamId,
                userIds,
            });

            return {
                success: true,
                removedCount,
            };
        },
        updateTeam: async (
            _parent: any,
            {
                projectId,
                teamId,
                name,
                version,
            }: {
                projectId: string;
                teamId: string;
                name: string;
                version: number;
            },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const team = await teamService.updateTeam({
                actorId: context.userId,
                projectId,
                teamId,
                name,
                version,
            });

            return {
                success: true,
                team,
            };
        },
    },
};
