import { mergeResolvers } from '@graphql-tools/merge';
import { authResolvers } from './auth';
import { projectResolvers } from './project';
import { taskResolvers } from './task.ts';
import { teamResolvers } from './team';

export const resolvers = mergeResolvers([
    authResolvers,
    projectResolvers,
    teamResolvers,
    taskResolvers,
]);
