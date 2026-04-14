import { mergeResolvers } from '@graphql-tools/merge';
import { authResolvers } from './auth';
import { projectResolvers } from './project';
import { teamResolvers } from './team';
import { taskResolvers } from './task';
import { notificationResolvers } from './notification';
import { realtimeResolvers } from './realtime';
import { automationResolvers } from './automation';

export const resolvers = mergeResolvers([
  authResolvers,
  projectResolvers,
  teamResolvers,
  taskResolvers,
  notificationResolvers,
  realtimeResolvers,
  automationResolvers,
]);
