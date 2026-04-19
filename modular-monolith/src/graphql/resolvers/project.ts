import type { GraphQLContext } from '../context.ts';
import type {
    Project,
    ProjectMember,
} from '../../modules/project/ProjectService.ts';
import type { User } from '../../modules/auth';
import { NotFoundError } from '../errors.ts';

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
            return context.loaders.user.byId.load(parent.createdBy);
        },
        projectMembers: (
            parent: Project,
            _args: PaginationArgs,
            _context: GraphQLContext,
        ) => null,
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
            // Authorized lookup since we are navigating from a member record
            return context.loaders.project.byActorIdAndProjectId.load({
                actorId: context.userId || '',
                projectId: parent.projectId,
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
        projects: (
            parent: User,
            _args: PaginationArgs,
            _context: GraphQLContext,
        ) => null,
    },

    Query: {
        project: (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            return context.loaders.project.byActorIdAndProjectId.load({
                actorId: context.userId || '',
                projectId: id,
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
                await context.loaders.project.byActorIdAndProjectId.loadMany(
                    ids.map((projectId) => ({ actorId, projectId })),
                );

            // Filter out Errors and nulls to return Project[]
            return results.filter(
                (res): res is Project =>
                    res !== null && !(res instanceof Error),
            );
        },
    },

    Mutation: {
        createProject: (
            _parent: any,
            { name, description }: { name: string; description?: string },
            _context: GraphQLContext,
        ) => {
            return null;
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
