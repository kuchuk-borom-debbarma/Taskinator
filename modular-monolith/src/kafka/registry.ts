import { teamCleanupListener as teamProjectCleanup } from '../modules/team/internal/listeners/ProjectDeletedListener';
import { memberCleanupListener as memberProjectCleanup } from '../modules/project/internal/listeners/ProjectDeletedListener';
import { projectMemberDeletedListener as teamMemberCleanup } from '../modules/team/internal/listeners/ProjectMemberDeletedListener';
import { projectTeamDeletedListener as teamTeamCleanup } from '../modules/team/internal/listeners/ProjectTeamDeletedListener';
import { userSignupStartedListener } from '../modules/auth/internal/listeners/UserSignupStartedListener.ts';
import { userCreatedListener } from '../modules/auth/internal/listeners/UserCreatedListener.ts';
import { realtimeRouterConsumer } from '../modules/realtime/internal/RealtimeKafkaConsumer.ts';
import { taskGraphListener } from '../modules/task/internal/listeners/TaskGraphListener.ts';

export {
    teamProjectCleanup,
    memberProjectCleanup,
    teamMemberCleanup,
    teamTeamCleanup,
    userSignupStartedListener,
    userCreatedListener,
    realtimeRouterConsumer,
    taskGraphListener,
};

export const startConsumers = async () => {
    console.log('Starting Kafka Consumers...');
    await Promise.all([
        teamProjectCleanup.init(),
        memberProjectCleanup.init(),
        teamMemberCleanup.init(),
        teamTeamCleanup.init(),
        userSignupStartedListener.init(),
        userCreatedListener.init(),
        realtimeRouterConsumer.init(),
        taskGraphListener.init(),
    ]);
};

export const stopConsumers = async () => {
    console.log('Stopping Kafka Consumers...');
    await Promise.all([
        teamProjectCleanup.stop(),
        memberProjectCleanup.stop(),
        teamMemberCleanup.stop(),
        teamTeamCleanup.stop(),
        userSignupStartedListener.stop(),
        userCreatedListener.stop(),
        realtimeRouterConsumer.stop(),
        taskGraphListener.stop(),
    ]);
};
