import type { GraphQLContext } from '../context.ts';

interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export const authResolvers = {
    User: {
        id: (u: any) => u.id,
        username: (u: any) => u.username,
        // projects resolved in project.ts
    },

    Query: {
        me: (_: any, __: any, context: GraphQLContext) => {
            return null;
        },
        user: (_: any, { id }: { id: string }, context: GraphQLContext) => {
            return null;
        },
        users: (_: any, { ids }: { ids: string[] }, context: GraphQLContext) => {
            return [];
        },
    },
};
