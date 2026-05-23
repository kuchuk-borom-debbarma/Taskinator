import { mergeResolvers } from '@graphql-tools/merge';
import { authResolvers } from './auth';
import { jsonScalarResolvers } from './jsonScalar';
import { notificationResolvers } from './notification';
import { projectResolvers } from './project';
import { realtimeResolvers } from './realtime';
import { taskResolvers } from './task.ts';
import { teamResolvers } from './team';

export const resolvers = mergeResolvers([
    authResolvers,
    projectResolvers,
    teamResolvers,
    notificationResolvers,
    realtimeResolvers,
    taskResolvers,
    jsonScalarResolvers,
]);
