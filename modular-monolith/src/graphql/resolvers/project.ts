import type { GraphQLContext } from '../context.ts';
import type { Project, ProjectMember } from '../../modules/project';
import { authService, type User } from '../../modules/auth';
import {
    MutationFailedError,
    NotFoundError,
    UnauthorizedError,
} from '../errors.ts';
import { projectService } from '../../modules/project';
import { encodeCursor } from '../../utils/utils.ts';

interface PaginationArgs {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}

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
            args: PaginationArgs,
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
        lastEventId: (parent: Project) => parent.lastEventId,
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

    User: {
        projects: async (
            parent: User,
            args: PaginationArgs,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { projects, nextCursor, prevCursor } =
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
        updateProject: (
            _parent: any,
            {
                id,
                name,
                description,
            }: { id: string; name?: string; description?: string },
            _context: GraphQLContext,
        ) => {
            return null;
        },
        deleteProjects: (
            _parent: any,
            { projectIds }: { projectIds: string[] },
            _context: GraphQLContext,
        ) => {
            return { success: true, deletedCount: 0 };
        },
        addProjectMembers: (
            _parent: any,
            { projectId, userIds }: { projectId: string; userIds: string[] },
            _context: GraphQLContext,
        ) => {
            return { success: true, project: null };
        },
        removeProjectMembers: (
            _parent: any,
            {
                projectId,
                memberIds,
            }: { projectId: string; memberIds: string[] },
            _context: GraphQLContext,
        ) => {
            return { success: true, removedCount: 0, project: null };
        },
    },
};
