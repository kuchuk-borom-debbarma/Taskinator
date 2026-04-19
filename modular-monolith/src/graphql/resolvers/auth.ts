import type { GraphQLContext } from '../context.ts';
import { NotFoundError } from '../errors.ts';
import type { User } from '../../modules/auth';

export const authResolvers = {
    User: {
        id: (parent: User) => parent.id,
        username: async (parent: User, _args: any, context: GraphQLContext) => {
            if (parent.username) return parent.username;
            const user = await context.loaders.user.byId.load(parent.id);
            if (!user) {
                throw new NotFoundError(`User with ID ${parent.id} not found`);
            }
            return user.username;
        },
    },

    Query: {
        me: (_parent: any, _args: any, context: GraphQLContext) => {
            if (!context.userId) return null;
            return context.loaders.user.byId.load(context.userId);
        },
        user: (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            return context.loaders.user.byId.load(id);
        },
        users: async (
            _parent: any,
            { ids }: { ids: string[] },
            context: GraphQLContext,
        ) => {
            const results = await context.loaders.user.byId.loadMany(ids);
            return results.filter((res) => res && !(res instanceof Error));
        },
    },
};
