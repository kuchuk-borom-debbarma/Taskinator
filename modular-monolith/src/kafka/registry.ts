import { projectDeletedListener as taskCleanup } from '../services/task/internal/listeners/ProjectDeletedListener';
import { teamCleanupListener as teamCleanup } from '../services/team/internal/listeners/ProjectDeletedListener';
import { memberCleanupListener as memberCleanup } from '../services/project/internal/listeners/ProjectDeletedListener';

export const startConsumers = async () => {
    console.log('Starting Kafka Consumers...');
    await Promise.all([
        taskCleanup.init(),
        teamCleanup.init(),
        memberCleanup.init(),
    ]);
};

export const stopConsumers = async () => {
    console.log('Stopping Kafka Consumers...');
    await Promise.all([
        taskCleanup.stop(),
        teamCleanup.stop(),
        memberCleanup.stop(),
    ]);
};
