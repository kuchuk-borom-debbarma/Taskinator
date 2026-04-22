import { authService, type User } from '../../modules/auth';
import type { GraphQLContext } from '../context.ts';
import { NotFoundError } from '../errors.ts';

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
        email: async (parent: User, _args: any, context: GraphQLContext) => {
            if (parent.email) return parent.email;
            const user = await context.loaders.user.byId.load(parent.id);
            if (!user) {
                throw new NotFoundError(`User with ID ${parent.id} not found`);
            }
            return user.email;
        },
        projectsCount: (parent: User) => parent.projectsCount || 0,
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

    Mutation: {
        signIn: async (
            _parent: any,
            { email, password_raw }: { email: string; password_raw: string },
            context: GraphQLContext,
        ) => {
            const result = await authService.signIn({
                email,
                password_raw,
            });
            if (!result) {
                throw new Error('Invalid email or password');
            }
            return result;
        },
    },
};
