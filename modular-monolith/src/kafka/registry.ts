import { projectDeletedListener as taskProjectCleanup } from '../services/task/internal/listeners/ProjectDeletedListener';
import { teamCleanupListener as teamProjectCleanup } from '../services/team/internal/listeners/ProjectDeletedListener';
import { memberCleanupListener as memberProjectCleanup } from '../services/project/internal/listeners/ProjectDeletedListener';

import { projectMemberDeletedListener as taskMemberCleanup } from '../services/task/internal/listeners/ProjectMemberDeletedListener';
import { projectMemberDeletedListener as teamMemberCleanup } from '../services/team/internal/listeners/ProjectMemberDeletedListener';

import { projectTeamDeletedListener as taskTeamCleanup } from '../services/task/internal/listeners/ProjectTeamDeletedListener';
import { projectTeamDeletedListener as teamTeamCleanup } from '../services/team/internal/listeners/ProjectTeamDeletedListener';

export {
    taskProjectCleanup,
    teamProjectCleanup,
    memberProjectCleanup,
    taskMemberCleanup,
    teamMemberCleanup,
    taskTeamCleanup,
    teamTeamCleanup,
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
    ]);
};
