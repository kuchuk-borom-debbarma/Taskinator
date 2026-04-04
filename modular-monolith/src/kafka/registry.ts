import { projectDeletedListener as taskProjectCleanup } from '../services/task/internal/listeners/ProjectDeletedListener';
import { teamCleanupListener as teamProjectCleanup } from '../services/team/internal/listeners/ProjectDeletedListener';
import { memberCleanupListener as memberProjectCleanup } from '../services/project/internal/listeners/ProjectDeletedListener';

import { projectMemberDeletedListener as taskMemberCleanup } from '../services/task/internal/listeners/ProjectMemberDeletedListener';
import { projectMemberDeletedListener as teamMemberCleanup } from '../services/team/internal/listeners/ProjectMemberDeletedListener';

import { projectTeamDeletedListener as taskTeamCleanup } from '../services/task/internal/listeners/ProjectTeamDeletedListener';
import { projectTeamDeletedListener as teamTeamCleanup } from '../services/team/internal/listeners/ProjectTeamDeletedListener';

import { projectTeamMemberDeletedListener as taskTeamMemberCleanup } from '../services/task/internal/listeners/ProjectTeamMemberDeletedListener';
import { taskTriggerListener as taskTriggerDelegator } from '../services/task-trigger/internal/listeners/ProjectTaskUpdatedListener';

import { taskTriggerListener } from '../services/task-trigger/internal/listeners/TaskTriggerListener';
import { taskDeleteListener as taskRecursiveCleanup } from '../services/task/internal/listeners/TaskDeleteListener';
import { taskDeletedListener as triggerTaskCleanup } from '../services/task-trigger/internal/listeners/TaskDeletedListener';

import { userSignupStartedListener } from '../services/auth/internal/listeners/UserSignupStartedListener.ts';
import { userCreatedListener } from '../services/auth/internal/listeners/UserCreatedListener.ts';

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
    ]);
};
