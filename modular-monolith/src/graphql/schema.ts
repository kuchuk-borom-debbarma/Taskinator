import { createSchema } from 'graphql-yoga';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import path from 'path';
import { resolvers } from './resolvers';
import type { GraphQLContext } from './context';

// Load all .graphql files from the schema directory
const typesArray = loadFilesSync(path.join(import.meta.dirname, 'schema'), {
  extensions: ['graphql'],
});

export const typeDefs = mergeTypeDefs(typesArray);

export const schema = createSchema<GraphQLContext>({
  typeDefs,
  resolvers: resolvers as any,
});
