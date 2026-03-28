import { projectDeletedListener as taskProjectCleanup } from '../services/task/internal/listeners/ProjectDeletedListener';
import { teamCleanupListener as teamProjectCleanup } from '../services/team/internal/listeners/ProjectDeletedListener';
import { memberCleanupListener as memberProjectCleanup } from '../services/project/internal/listeners/ProjectDeletedListener';

import { projectMemberDeletedListener as taskMemberCleanup } from '../services/task/internal/listeners/ProjectMemberDeletedListener';
import { projectMemberDeletedListener as teamMemberCleanup } from '../services/team/internal/listeners/ProjectMemberDeletedListener';

export { taskProjectCleanup, teamProjectCleanup, memberProjectCleanup, taskMemberCleanup, teamMemberCleanup };

export const startConsumers = async () => {
    console.log('Starting Kafka Consumers...');
    await Promise.all([
        taskProjectCleanup.init(),
        teamProjectCleanup.init(),
        memberProjectCleanup.init(),
        
        taskMemberCleanup.init(),
        teamMemberCleanup.init(),
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
    ]);
};
