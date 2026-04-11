import { type YogaInitialContext } from 'graphql-yoga';
import { createLoaders } from './loaders';

export interface GraphQLContext extends YogaInitialContext {
    userId?: string;
    loaders: ReturnType<typeof createLoaders>;
}

export const createContext = (userId?: string) => {
    return {
        userId,
        loaders: createLoaders(userId || ''),
    };
};
