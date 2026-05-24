import type { User } from '../../../modules/auth';
import type { Project, ProjectMember } from '../../../modules/project';
import { projectService } from '../../../modules/project';
import type { Connection, PaginationParams } from '../../types/pagination.ts';
import { encodeCursor } from '../../utils/utils.ts';
import type { GraphQLContext } from '../context.ts';
import {
    MutationFailedError,
    NotFoundError,
    UnauthorizedError,
} from '../errors.ts';

export const projectResolvers = {
    Project: {
        id: (parent: Project) => parent.id,
        name: (parent: Project) => parent.name,
        description: (parent: Project) => parent.description,
        creator: (parent: Project, _args: any, context: GraphQLContext) => {
            return context.loaders.user.byId.load(parent.userId);
        },
        projectMembers: async (
            parent: Project,
            args: PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { members, nextCursor, prevCursor } =
                await projectService.getProjectMembers(
                    context.userId,
                    parent.id,
                    args,
                );

            return {
                edges: members.map((m: any) => ({
                    node: m,
                    cursor: encodeCursor(
                        m.epochPrecision || m.createdAt.toISOString(),
                        m.id,
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
        createdAt: (parent: Project) => parent.createdAt.toISOString(),
        updatedAt: (parent: Project) => parent.updatedAt?.toISOString() || null,
        version: (parent: Project) => parent.version,
        projectMembersCount: (parent: Project) => parent.membersCount || 0,
        tasksCount: (parent: Project) => parent.tasksCount || 0,
        teamsCount: (parent: Project) => parent.teamsCount || 0,
    },

    ProjectMember: {
        id: (parent: ProjectMember) => parent.id,
        project: (
            parent: ProjectMember,
            _args: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId)
                throw new UnauthorizedError('UserId not found in context.');
            // Authorized lookup since we are navigating from a member record
            return context.loaders.project.byActorIdAndId.load({
                actorId: context.userId || '',
                id: parent.projectId,
            });
        },
        user: async (
            parent: ProjectMember,
            _args: any,
            context: GraphQLContext,
        ) => {
            const user = await context.loaders.user.byId.load(parent.userId);
            if (!user) {
                throw new NotFoundError(
                    `User with ID ${parent.userId} not found for member ${parent.id}`,
                );
            }
            return user;
        },
        createdAt: (parent: ProjectMember) => parent.createdAt.toISOString(),
        version: (parent: ProjectMember) => parent.version,
    },
    ProjectConnection: {
        totalCount: (parent: Connection<Project>) => parent.totalCount || 0,
    },

    User: {
        projects: async (
            parent: User,
            args: PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { projects, totalCount, nextCursor, prevCursor } =
                await projectService.getProjectsOfUser(
                    parent.id, // Target user
                    args,
                );

            return {
                edges: projects.map((p: any) => ({
                    node: p,
                    cursor: encodeCursor(
                        p.epochPrecision || p.createdAt.toISOString(),
                        p.id,
                    ),
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

    Query: {
        project: (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            return context.loaders.project.byActorIdAndId.load({
                actorId: context.userId || '',
                id: id,
            });
        },
        projects: async (
            _parent: any,
            { ids }: { ids?: string[] },
            context: GraphQLContext,
        ) => {
            if (!ids || ids.length === 0) return [];
            const actorId = context.userId || '';
            const results =
                await context.loaders.project.byActorIdAndId.loadMany(
                    ids.map((id) => ({ actorId, id })),
                );

            // Filter out Errors and nulls to return Project[]
            return results.filter(
                (res): res is Project =>
                    res !== null && !(res instanceof Error),
            );
        },
    },

    Mutation: {
        createProject: async (
            _parent: any,
            { name, description }: { name: string; description?: string },
            context: GraphQLContext,
        ) => {
            if (!context.userId)
                throw new UnauthorizedError('userId not found in context.');
            const result = await projectService.createProject({
                actorId: context.userId,
                name,
                description,
            });
            if (!result)
                throw new MutationFailedError(`Failed to create project`);
            return result;
        },
        updateProject: async (
            _parent: any,
            {
                id,
                version,
                name,
                description,
            }: {
                id: string;
                version: number;
                name?: string;
                description?: string;
            },
            context: GraphQLContext,
        ) => {
            if (!context.userId)
                throw new UnauthorizedError('userId not found in context.');

            const result = await projectService.updateProject({
                actorId: context.userId,
                id,
                version,
                name,
                description,
            });

            if (!result) {
                throw new MutationFailedError(
                    'Failed to update project. Version mismatch or unauthorized.',
                );
            }

            return result;
        },
        deleteProjects: async (
            _parent: any,
            { projectIds }: { projectIds: string[] },
            context: GraphQLContext,
        ) => {
            if (!context.userId)
                throw new UnauthorizedError('userId not found in context.');

            return await projectService.deleteProjects({
                actorId: context.userId,
                projectIds,
            });
        },
        addProjectMembers: async (
            _parent: any,
            { projectId, userIds }: { projectId: string; userIds: string[] },
            context: GraphQLContext,
        ) => {
            if (!context.userId)
                throw new UnauthorizedError('userId not found in context.');

            const success = await projectService.addProjectMembers({
                actorId: context.userId,
                projectId,
                userIds,
            });

            return { success };
        },
        removeProjectMembers: async (
            _parent: any,
            {
                projectId,
                memberIds,
            }: { projectId: string; memberIds: string[] },
            context: GraphQLContext,
        ) => {
            if (!context.userId)
                throw new UnauthorizedError('userId not found in context.');

            const success = await projectService.removeProjectMembers({
                actorId: context.userId,
                projectId,
                userIds: memberIds,
            });

            return { success };
        },
    },
};
