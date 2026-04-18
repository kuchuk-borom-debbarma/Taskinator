import type { GraphQLContext } from '../context.ts';
import { taskService } from '../../modules/task';
import type { ProjectTask, TaskLink } from '../../modules/task/TaskService.ts';
import { resolveTask, buildRef } from './helpers.ts';
import { UnauthorizedError, NotFoundError } from '../errors';

const buildLinkConnection = (
    links: TaskLink[],
    nextCursor: string | null,
    prevCursor: string | null,
) => ({
    edges: links.map((l: TaskLink) => ({
        node: l,
        cursor: `${l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt}|${l.id}`,
    })),
    pageInfo: {
        hasNextPage: !!nextCursor,
        hasPreviousPage: !!prevCursor,
        startCursor: prevCursor,
        endCursor: nextCursor,
    },
});

export const taskResolvers = {
    TaskLink: {
        id: (l: any) => l.id,
        projectId: (l: any) => l.projectId,
        sourceTaskId: (l: any) => l.sourceTaskId,
        targetTaskId: (l: any) => l.targetTaskId,
        label: (l: any) => l.label,
        createdBy: (l: any) => l.createdBy,
        createdAt: (l: any) =>
            l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
        sourceTask: (l: any) => buildRef(l.sourceTaskId, 'ProjectTask'),
        targetTask: (l: any) => buildRef(l.targetTaskId, 'ProjectTask'),
    },

    NeighbourhoodNode: {
        task: (n: any) => ({ ...buildRef(n.taskId, 'ProjectTask'), ...n.task }),
    },

    ProjectTask: {
        id: (t: any) => t.id,
        projectId: async (t: any, _: any, context: GraphQLContext) => {
            if (t.projectId) return t.projectId;
            const task = await resolveTask(t, context);
            return task?.projectId;
        },
        teamId: async (t: any, _: any, context: GraphQLContext) => {
            if (t.teamId !== undefined) return t.teamId;
            const task = await resolveTask(t, context);
            return task?.teamId;
        },
        memberId: async (t: any, _: any, context: GraphQLContext) => {
            if (t.memberId !== undefined) return t.memberId;
            const task = await resolveTask(t, context);
            return task?.memberId;
        },
        title: async (t: any, _: any, context: GraphQLContext) => {
            if (t.title) return t.title;
            const task = await resolveTask(t, context);
            return task?.title;
        },
        description: async (t: any, _: any, context: GraphQLContext) => {
            if (t.description !== undefined) return t.description;
            const task = await resolveTask(t, context);
            return task?.description;
        },
        status: async (t: any, _: any, context: GraphQLContext) => {
            if (t.status) return t.status;
            const task = await resolveTask(t, context);
            return task?.status;
        },
        version: async (t: any, _: any, context: GraphQLContext) => {
            if (t.version !== undefined) return t.version;
            const task = await resolveTask(t, context);
            return task?.version;
        },
        createdAt: async (t: any, _: any, context: GraphQLContext) => {
            const date = t.createdAt;
            if (date) return date instanceof Date ? date.toISOString() : date;
            const task = await resolveTask(t, context);
            const taskDate = task?.createdAt;
            return taskDate instanceof Date ? taskDate.toISOString() : taskDate;
        },
        updatedAt: async (t: any, _: any, context: GraphQLContext) => {
            const date = t.updatedAt;
            if (date) return date instanceof Date ? date.toISOString() : date;
            const task = await resolveTask(t, context);
            const taskDate = task?.updatedAt;
            return taskDate instanceof Date ? taskDate.toISOString() : taskDate;
        },
        priority: (t: any) => t.priority || 3,
        dueDate: (t: any) => t.dueDate || null,
        project: async (t: any, _: any, context: GraphQLContext) => {
            let projectId = t.projectId;
            if (!projectId) {
                const task = await resolveTask(t, context);
                projectId = task?.projectId;
            }
            return buildRef(projectId, 'Project');
        },
        team: async (t: any, _: any, context: GraphQLContext) => {
            let teamId = t.teamId;
            if (teamId === undefined) {
                const task = await resolveTask(t, context);
                teamId = task?.teamId;
            }
            return buildRef(teamId, 'Team');
        },
        member: async (t: any, _: any, context: GraphQLContext) => {
            let memberId = t.memberId;
            if (memberId === undefined) {
                const task = await resolveTask(t, context);
                memberId = task?.memberId;
            }
            return buildRef(memberId, 'User');
        },
        assignee: async (t: any, _: any, context: GraphQLContext) => {
            let memberId = t.memberId;
            if (memberId === undefined) {
                const task = await resolveTask(t, context);
                memberId = task?.memberId;
            }
            return buildRef(memberId, 'User');
        },
        creator: async (t: any, _: any, context: GraphQLContext) => {
            let createdBy = t.createdBy;
            if (!createdBy) {
                const task = await resolveTask(t, context);
                createdBy = task?.createdBy;
            }
            return buildRef(createdBy, 'User');
        },
        updater: async (t: any, _: any, context: GraphQLContext) => {
            let updatedBy = t.updatedBy;
            if (!updatedBy) {
                const task = await resolveTask(t, context);
                updatedBy = task?.updatedBy;
            }
            return buildRef(updatedBy, 'User');
        },

        totalIncomingLinksCount: (t: any) => t.totalIncomingCount || 0,
        totalOutgoingLinksCount: (t: any) => t.totalOutgoingCount || 0,
        directIncomingLinksCount: (t: any) => t.directIncomingCount || 0,
        directOutgoingLinksCount: (t: any) => t.directOutgoingCount || 0,
        incomingLabelCounts: (t: any) => {
            const counts = t.incomingLabelCounts || {};
            const edges = Object.entries(counts).map(([label, count]) => ({
                node: { label, count: Number(count) },
                cursor: label,
            }));
            return {
                edges,
                pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: edges.length > 0 ? edges[0]?.cursor : null,
                    endCursor: edges.length > 0 ? edges[edges.length - 1]?.cursor : null,
                },
            };
        },
        outgoingLabelCounts: (t: any) => {
            const counts = t.outgoingLabelCounts || {};
            const edges = Object.entries(counts).map(([label, count]) => ({
                node: { label, count: Number(count) },
                cursor: label,
            }));
            return {
                edges,
                pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: edges.length > 0 ? edges[0]?.cursor : null,
                    endCursor: edges.length > 0 ? edges[edges.length - 1]?.cursor : null,
                },
            };
        },

        incomingLinks: async (
            t: any,
            { first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            const { links, nextCursor, prevCursor } = await taskService.getTaskLinks(
                { userId: context.userId, projectId: t.projectId, taskId: t.id, direction: 'incoming' },
                { first, after, last, before },
            );
            return buildLinkConnection(links, nextCursor, prevCursor);
        },

        outgoingLinks: async (
            t: any,
            { first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            const { links, nextCursor, prevCursor } = await taskService.getTaskLinks(
                { userId: context.userId, projectId: t.projectId, taskId: t.id, direction: 'outgoing' },
                { first, after, last, before },
            );
            return buildLinkConnection(links, nextCursor, prevCursor);
        },
    },

    Query: {
        projectTasks: async (
            _: any,
            { projectId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            console.log('--------------------------------------------------');
            console.log(`[RESOLVER CRITICAL] projectTasks called!`);
            console.log(`- ProjectID: ${projectId}`);
            console.log(`- UserID:    ${context.userId}`);
            console.log('--------------------------------------------------');
            
            if (!context.userId) throw new UnauthorizedError();
            
            const { tasks, nextCursor, prevCursor } = await taskService.getTasks(
                context.userId,
                projectId,
                { first, after, last, before },
            );

            console.log(`[RESOLVER CRITICAL] found ${tasks.length} tasks`);

            return {
                edges: tasks.map((t: ProjectTask) => ({
                    node: t,
                    cursor: `${t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt}|${t.id}`,
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        task: async (_: any, { id }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            return context.loaders.task.load(id);
        },
        taskNeighbourhood: async (
            _: any,
            { projectId, taskId, maxDepth, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const [focusedTask, result] = await Promise.all([
                context.loaders.task.load(taskId),
                taskService.getTaskNeighbourhood({
                    userId: context.userId,
                    projectId,
                    taskId,
                    maxDepth,
                    first,
                    after,
                    last,
                    before,
                }),
            ]);

            if (!focusedTask) throw new NotFoundError('Task not found');

            return {
                focusedTask,
                nodes: {
                    edges: result.neighbours.map(n => ({
                        node: n,
                        cursor: `${n.depth}|${n.task?.createdAt.toISOString()}|${n.taskId}`
                    })),
                    pageInfo: {
                        hasNextPage: !!result.nextCursor,
                        hasPreviousPage: !!result.prevCursor,
                        startCursor: result.prevCursor,
                        endCursor: result.nextCursor,
                    }
                },
                edges: {
                    edges: result.edges.map(e => ({
                        node: e,
                        cursor: e.id
                    })),
                    pageInfo: {
                        hasNextPage: false,
                        hasPreviousPage: false,
                        startCursor: null,
                        endCursor: null,
                    }
                },
                pageInfo: {
                    hasNextPage: !!result.nextCursor,
                    hasPreviousPage: !!result.prevCursor,
                    startCursor: result.prevCursor,
                    endCursor: result.nextCursor,
                },
            };
        },

        projectTaskLinks: async (
            _: any,
            { projectId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            console.log(`[RESOLVER CRITICAL] projectTaskLinks - projectId: ${projectId}, userId: ${context.userId}`);
            if (!context.userId) throw new UnauthorizedError();
            const { links, nextCursor, prevCursor } = await taskService.getProjectLinks(
                context.userId, 
                projectId, 
                { first, after, last, before }
            );
            console.log(`[RESOLVER CRITICAL] found ${links.length} links`);
            return buildLinkConnection(links, nextCursor, prevCursor);
        },
    },

    Mutation: {
        createTask: async (
            _: any,
            { projectId, teamId, memberId, title, description, status }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return taskService.createTask({
                userId: context.userId,
                projectId,
                teamId,
                memberId,
                title,
                description,
                status,
            });
        },
        updateTask: async (
            _: any,
            { taskId, title, description, status }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return taskService.updateTask({
                userId: context.userId,
                taskId,
                title,
                description,
                status,
            });
        },
        deleteTask: async (_: any, { taskId }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            await taskService.deleteTask(context.userId, taskId);
            return taskId;
        },
        createTaskLink: async (
            _: any,
            { projectId, sourceTaskId, targetTaskId, label }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return taskService.createLink({
                userId: context.userId,
                projectId,
                sourceTaskId,
                targetTaskId,
                label,
            });
        },
        deleteTaskLink: async (_: any, { linkId }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            await taskService.deleteLink(context.userId, linkId);
            return linkId;
        },
    },
};
