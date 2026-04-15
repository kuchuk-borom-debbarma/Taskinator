import type { GraphQLContext } from '../context.ts';
import { automationService } from '../../modules/automation';

export const automationResolvers = {
  AutomationRule: {
    rules: (t: any) => (typeof t.rules === 'string' ? t.rules : JSON.stringify(t.rules)),
    createdAt: (t: any) => (t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt),
    updatedAt: (t: any) => (t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt),
  },
  Query: {
    automations: async (_: any, args: any, context: GraphQLContext) => {
      const { automations, nextCursor } = await automationService.getAutomationsByFilter({
        ...args,
        limit: args.first,
        cursor: args.after,
      });
      return {
        edges: automations.map((t) => ({ node: t, cursor: t.id })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor, hasPreviousPage: false },
      };
    },
  },
  Mutation: {
    addAutomation: async (_: any, args: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const automation = await automationService.addAutomation({
        ...args,
        userId: context.userId,
        rules: JSON.parse(args.rules),
      });
      return { ...automation, rules: JSON.stringify(automation.rules) };
    },
    updateAutomation: async (_: any, args: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const automation = await automationService.updateAutomation({
        ...args,
        userId: context.userId,
        rules: args.rules ? JSON.parse(args.rules) : undefined,
      });
      return { ...automation, rules: JSON.stringify(automation.rules) };
    },
    deleteAutomation: async (_: any, { automationId }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      await automationService.deleteAutomation({
        userId: context.userId,
        automationId,
      });
      return true;
    },
  },
};
