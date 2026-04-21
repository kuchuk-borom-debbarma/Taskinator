import type { YogaInitialContext } from 'graphql-yoga';
import { createLoaders, type DataLoaders } from './dls';

export interface GraphQLContext extends YogaInitialContext {
    userId?: string;
    loaders: DataLoaders;
}

export const createContext = (userId?: string) => {
    return {
        userId,
        loaders: createLoaders(userId),
    };
};
