import type { GraphQLContext } from '../context.ts';
import { taskService } from '../../modules/task';
import { automationService } from '../../modules/automation';
import { pubsub } from '../pubsub';

export const taskResolvers = {
  Task: {
    createdAt: (t: any) => (t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt),
    updatedAt: (t: any) => (t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt),
    project: (t: any, _: any, context: GraphQLContext) => context.loaders.project.load(t.projectId),
    team: (t: any, _: any, context: GraphQLContext) => (t.teamId ? context.loaders.team.load(t.teamId) : null),
    assignee: (t: any, _: any, context: GraphQLContext) => (t.memberId ? context.loaders.user.load(t.memberId) : null),
    creator: (t: any, _: any, context: GraphQLContext) => context.loaders.user.load(t.createdBy),
    automations: (t: any, _: any, context: GraphQLContext) => context.loaders.taskAutomations.load(t.id),
  },
  Query: {
    tasks: async (_: any, { projectId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { tasks, nextCursor } = await taskService.getTasks(context.userId, projectId, {
        limit: first,
        cursor: after,
      });

      return {
        edges: tasks.map((t) => ({ node: t, cursor: t.id })),
        pageInfo: {
          hasNextPage: !!nextCursor,
          endCursor: nextCursor,
          hasPreviousPage: false,
        }
      };
    },
  },
  Mutation: {
    createTask: async (_: any, args: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return taskService.createTask({
        ...args,
        userId: context.userId,
        initialStatus: 'TODO',
      });
    },
    updateTasks: async (_: any, { projectId, tasks }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return taskService.updateTasks({
        userId: context.userId,
        projectId,
        tasks,
      });
    },
    deleteTasks: async (_: any, { projectId, taskIds }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return taskService.deleteTask({
        userId: context.userId,
        projectId,
        taskIds,
      });
    },
  },
};
