import { projectDeletedListener as taskProjectCleanup } from '../modules/task/internal/listeners/ProjectDeletedListener';
import { teamCleanupListener as teamProjectCleanup } from '../modules/team/internal/listeners/ProjectDeletedListener';
import { memberCleanupListener as memberProjectCleanup } from '../modules/project/internal/listeners/ProjectDeletedListener';

import { projectMemberDeletedListener as taskMemberCleanup } from '../modules/task/internal/listeners/ProjectMemberDeletedListener';
import { projectMemberDeletedListener as teamMemberCleanup } from '../modules/team/internal/listeners/ProjectMemberDeletedListener';

import { projectTeamDeletedListener as taskTeamCleanup } from '../modules/task/internal/listeners/ProjectTeamDeletedListener';
import { projectTeamDeletedListener as teamTeamCleanup } from '../modules/team/internal/listeners/ProjectTeamDeletedListener';

import { projectTeamMemberDeletedListener as taskTeamMemberCleanup } from '../modules/task/internal/listeners/ProjectTeamMemberDeletedListener';
import { taskTriggerListener as taskTriggerDelegator } from '../modules/task-trigger/internal/listeners/ProjectTaskUpdatedListener';

import { taskTriggerListener } from '../modules/task-trigger/internal/listeners/TaskTriggerListener';
import { taskDeleteListener as taskRecursiveCleanup } from '../modules/task/internal/listeners/TaskDeleteListener';
import { taskDeletedListener as triggerTaskCleanup } from '../modules/task-trigger/internal/listeners/TaskDeletedListener';

import { userSignupStartedListener } from '../modules/auth/internal/listeners/UserSignupStartedListener.ts';
import { userCreatedListener } from '../modules/auth/internal/listeners/UserCreatedListener.ts';
import { realtimeKafkaConsumer } from '../modules/realtime/internal/RealtimeKafkaConsumer';


export {
    taskProjectCleanup,
    teamProjectCleanup,
    memberProjectCleanup,
    taskMemberCleanup,
    teamMemberCleanup,
    taskTeamCleanup,
    teamTeamCleanup,
    taskTeamMemberCleanup,
    taskTriggerDelegator,
    taskTriggerListener,
    taskRecursiveCleanup,
    triggerTaskCleanup,
    userSignupStartedListener,
    userCreatedListener,
    realtimeKafkaConsumer,
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

        taskTriggerDelegator.init(),

        taskTriggerListener.init(),

        taskRecursiveCleanup.init(),

        triggerTaskCleanup.init(),

        userSignupStartedListener.init(),
        userCreatedListener.init(),
        realtimeKafkaConsumer.init(),
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

        triggerTaskCleanup.stop(),

        userSignupStartedListener.stop(),
        userCreatedListener.stop(),
        realtimeKafkaConsumer.stop(),
    ]);
};
