import type { GraphQLContext } from '../context.ts';
import { taskService } from '../../modules/task';
import { taskTriggerService } from '../../modules/task-trigger';
import { pubsub } from '../pubsub';

export const taskResolvers = {
  Task: {
    createdAt: (t: any) => (t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt),
    updatedAt: (t: any) => (t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt),
    project: (t: any, _: any, context: GraphQLContext) => context.loaders.project.load(t.projectId),
    team: (t: any, _: any, context: GraphQLContext) => (t.teamId ? context.loaders.team.load(t.teamId) : null),
    assignee: (t: any, _: any, context: GraphQLContext) => (t.memberId ? context.loaders.user.load(t.memberId) : null),
    creator: (t: any, _: any, context: GraphQLContext) => context.loaders.user.load(t.createdBy),
    triggers: (t: any, _: any, context: GraphQLContext) => context.loaders.taskTriggers.load(t.id),
  },
  TaskTrigger: {
    triggerData: (t: any) => (typeof t.triggerData === 'string' ? t.triggerData : JSON.stringify(t.triggerData)),
    createdAt: (t: any) => (t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt),
    updatedAt: (t: any) => (t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt),
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
        },
      };
    },
    taskTriggers: async (_: any, { taskId, first, after }: any, context: GraphQLContext) => {
      const { triggers, nextCursor } = await taskTriggerService.getTriggersForTask({
        taskId,
        limit: first,
        cursor: after,
      });
      return {
        edges: triggers.map((t) => ({ node: t, cursor: t.id })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor, hasPreviousPage: false },
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
    addTaskTrigger: async (_: any, args: any, context: GraphQLContext) => {
      await taskTriggerService.addTriggerToTask({
        ...args,
        userId: context.userId!,
        triggerData: JSON.parse(args.triggerData),
      });
      const { triggers } = await taskTriggerService.getTriggersForTask({ taskId: args.taskId, limit: 1 });
      if (!triggers[0]) throw new Error('Failed to create trigger');
      return { ...triggers[0], triggerData: JSON.stringify(triggers[0].triggerData) };
    },
    updateTaskTrigger: async (_: any, args: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      await taskTriggerService.updateTrigger({
        ...args,
        userId: context.userId,
        triggerData: args.triggerData ? JSON.parse(args.triggerData) : undefined,
      });
      return {
         id: args.triggerId,
         name: args.name,
         triggerType: args.triggerType,
         triggerData: args.triggerData ? args.triggerData : null
      };
    },
    deleteTaskTrigger: async (_: any, { taskId, triggerId }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      await taskTriggerService.deleteTrigger({
        userId: context.userId,
        triggerId,
      });
      return true;
    },
  },

};
