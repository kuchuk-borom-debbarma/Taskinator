import { projectDeletedListener as taskProjectCleanup } from '../modules/task/internal/listeners/ProjectDeletedListener';
import { teamCleanupListener as teamProjectCleanup } from '../modules/team/internal/listeners/ProjectDeletedListener';
import { memberCleanupListener as memberProjectCleanup } from '../modules/project/internal/listeners/ProjectDeletedListener';

import { projectMemberDeletedListener as taskMemberCleanup } from '../modules/task/internal/listeners/ProjectMemberDeletedListener';
import { projectMemberDeletedListener as teamMemberCleanup } from '../modules/team/internal/listeners/ProjectMemberDeletedListener';

import { projectTeamDeletedListener as taskTeamCleanup } from '../modules/task/internal/listeners/ProjectTeamDeletedListener';
import { projectTeamDeletedListener as teamTeamCleanup } from '../modules/team/internal/listeners/ProjectTeamDeletedListener';

import { projectTeamMemberDeletedListener as taskTeamMemberCleanup } from '../modules/task/internal/listeners/ProjectTeamMemberDeletedListener';
import { taskDeleteListener as taskRecursiveCleanup } from '../modules/task/internal/listeners/TaskDeleteListener';

import { userSignupStartedListener } from '../modules/auth/internal/listeners/UserSignupStartedListener.ts';
import { userCreatedListener } from '../modules/auth/internal/listeners/UserCreatedListener.ts';
import { realtimeRouterConsumer } from '../modules/realtime/internal/RealtimeKafkaConsumer.ts';


export {
    taskProjectCleanup,
    teamProjectCleanup,
    memberProjectCleanup,
    taskMemberCleanup,
    teamMemberCleanup,
    taskTeamCleanup,
    teamTeamCleanup,
    taskTeamMemberCleanup,
    taskRecursiveCleanup,
    userSignupStartedListener,
    userCreatedListener,
    realtimeRouterConsumer,
};

export const startConsumers = async () => {
    console.log('Starting Kafka Consumers...');
    await Promise.all([
        taskProjectCleanup.init(),
        teamProjectCleanup.init(),
        memberProjectCleanup.init(),

        taskMemberCleanup.init(),
        teamMemberCleanup.init(),

        taskTeamCleanup.init(),
        teamTeamCleanup.init(),

        taskTeamMemberCleanup.init(),

        taskRecursiveCleanup.init(),

        userSignupStartedListener.init(),
        userCreatedListener.init(),
        realtimeRouterConsumer.init(),
    ]);
};

export const stopConsumers = async () => {
    console.log('Stopping Kafka Consumers...');
    await Promise.all([
        taskProjectCleanup.stop(),
        teamProjectCleanup.stop(),
        memberProjectCleanup.stop(),

        taskMemberCleanup.stop(),
        teamMemberCleanup.stop(),

        taskTeamCleanup.stop(),
        teamTeamCleanup.stop(),

        taskTeamMemberCleanup.stop(),

        taskRecursiveCleanup.stop(),

        userSignupStartedListener.stop(),
        userCreatedListener.stop(),
        realtimeRouterConsumer.stop(),
    ]);
};
