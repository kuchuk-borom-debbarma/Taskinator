import path from 'node:path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { createSchema } from 'graphql-yoga';
import type { GraphQLContext } from './context';
import { resolvers } from './resolvers';

// Load all .graphql files from the schema directory
const typesArray = loadFilesSync(path.join(import.meta.dirname, 'schema'), {
    extensions: ['graphql'],
});

export const typeDefs = mergeTypeDefs(typesArray);

export const schema = createSchema<GraphQLContext>({
    typeDefs,
    resolvers: resolvers as any,
});
