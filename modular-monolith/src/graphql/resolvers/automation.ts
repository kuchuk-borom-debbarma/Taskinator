import type { GraphQLContext } from '../context.ts';
import { automationService } from '../../modules/automation';

export const automationResolvers = {
    AutomationRule: {
        rules: (t: any) =>
            typeof t.rules === 'string' ? t.rules : JSON.stringify(t.rules),
        createdAt: (t: any) =>
            t.createdAt instanceof Date
                ? t.createdAt.toISOString()
                : t.createdAt,
        updatedAt: (t: any) =>
            t.updatedAt instanceof Date
                ? t.updatedAt.toISOString()
                : t.updatedAt,
    },
    Query: {
        automations: async () => {
            return {
                edges: [],
                pageInfo: {
                    hasNextPage: false,
                    endCursor: null,
                    hasPreviousPage: false,
                },
            };
        },
    },
    Mutation: {
        addAutomation: async () => {
            return null;
        },
        updateAutomation: async () => {
            return null;
        },
        deleteAutomation: async () => {
            return true;
        },
    },
};

