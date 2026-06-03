import { mergeResolvers } from '@graphql-tools/merge';
import { traceResolverMap } from '../../tracing/index.ts';
import { authResolvers } from './auth';
import { projectResolvers } from './project';
import { taskResolvers } from './task.ts';
import { taskAutomationResolvers } from './task-automation.ts';
import { teamResolvers } from './team';

export const resolvers = traceResolverMap(
    mergeResolvers([
        authResolvers,
        projectResolvers,
        teamResolvers,
        taskResolvers,
        taskAutomationResolvers,
    ]) as any,
);
