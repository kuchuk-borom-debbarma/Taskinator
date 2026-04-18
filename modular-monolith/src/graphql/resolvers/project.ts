import type { GraphQLContext } from '../context.ts';
import { projectService } from '../../modules/project';
import { resolveProject, resolveUser, buildRef } from './helpers.ts';
import { UnauthorizedError } from '../errors';
import { encodeCursor } from '../../utils/utils.ts';

export const projectResolvers = {
    Project: {
        id: (p: any) => p.id,
        userId: (p: any) => p.userId,
        name: async (p: any, _: any, context: GraphQLContext) => {
            const project = await resolveProject(p, context);
            return project?.name;
        },
        description: async (p: any, _: any, context: GraphQLContext) => {
            const project = await resolveProject(p, context);
            return project?.description;
        },
        createdAt: async (p: any) => {
            const project = await resolveProject(p, null as any); // Date formatting doesn't need context if hydrated
            const date = project?.createdAt ?? p.createdAt;
            return date instanceof Date ? date.toISOString() : date;
        },
        updatedAt: async (p: any) => {
            const project = await resolveProject(p, null as any);
            const date = project?.updatedAt ?? p.updatedAt;
            return date instanceof Date ? date.toISOString() : date;
        },
        creator: (p: any) => buildRef(p.userId, 'User'),
    },
    ProjectMember: {
        id: (m: any) => m.id,
        projectId: (m: any) => m.projectId,
        userId: (m: any) => m.userId,
        createdAt: (m: any) =>
            m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
        user: (m: any) => buildRef(m.userId, 'User'),
        project: (m: any) => buildRef(m.projectId, 'Project'),
    },
    Query: {
        projects: async (
            _: any,
            { first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            const { projects, nextCursor, prevCursor } = await projectService.getProjects(
                context.userId,
                { first, after, last, before },
            );

            return {
                edges: projects.map((p: any) => ({
                    node: p,
                    cursor: encodeCursor(p.epochPrecision, p.id),
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        project: async (_: any, { id }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            return projectService.getProject(context.userId, id);
        },
        projectMembers: async (
            _: any,
            { projectId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            const { members, nextCursor, prevCursor } =
                await projectService.getProjectMembers(
                    context.userId,
                    projectId,
                    { first, after, last, before },
                );
            return {
                edges: members.map((m: any) => ({ 
                    node: m, 
                    cursor: encodeCursor(m.epochPrecision, m.id) 
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
        createProject: async (
            _: any,
            { name, description }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return projectService.createProject({
                name,
                description,
                userId: context.userId,
            });
        },
        updateProject: async (
            _: any,
            { id, name, description }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return projectService.updateProject({
                userId: context.userId,
                projectId: id,
                name,
                description,
            });
        },
        deleteProjects: async (
            _: any,
            { projectIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            const deletedCount = await projectService.deleteProjects({
                userId: context.userId,
                projectIds,
            });
            return { success: true, deletedCount: projectIds.length };
        },
        addProjectMembers: async (
            _: any,
            { projectId, userIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            await projectService.addProjectMembers({
                userId: context.userId,
                projectId,
                usersToAdd: userIds,
            });
            return { 
                success: true, 
                project: { id: projectId } 
            };
        },
        removeProjectMembers: async (
            _: any,
            { projectId, memberIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            await projectService.deleteProjectMembers({
                userId: context.userId,
                projectId,
                memberIds,
            });
            return {
                success: true,
                removedCount: memberIds.length,
                project: { id: projectId }
            };
        },
    },
};
