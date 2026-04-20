import { ProjectEvents_BatchAggregator } from './consumers/project/ProjectEvents_BatchAggregator.ts';
import { ProjectAggregated_AuthUserCountListener } from '../modules/auth/internal/listeners/ProjectAggregated_AuthUserCountListener.ts';
import { ProjectAggregated_TeamCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_TeamCleanupListener.ts';
import { ProjectAggregated_TeamMemberCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_TeamMemberCleanupListener.ts';
import { ProjectAggregated_TaskCleanupListener } from '../modules/task/internal/listeners/ProjectAggregated_TaskCleanupListener.ts';
import { ProjectAggregated_TaskLinkCleanupListener } from '../modules/task/internal/listeners/ProjectAggregated_TaskLinkCleanupListener.ts';
import { logger } from '../logger';

/**
 * Event Processing Registry
 *
 * Manages the lifecycle of all domain-specific smart consumers and execution listeners.
 */
export async function startConsumers() {
    logger.info('[Registry] Starting domain event consumers...');

    const projectAggregator = new ProjectEvents_BatchAggregator();
    const authProjectListener = new ProjectAggregated_AuthUserCountListener();

    // Team Module Cleanup
    const teamCleanupListener = new ProjectAggregated_TeamCleanupListener();
    const teamMemberCleanupListener =
        new ProjectAggregated_TeamMemberCleanupListener();

    // Task Module Cleanup
    const taskCleanupListener = new ProjectAggregated_TaskCleanupListener();
    const taskLinkCleanupListener =
        new ProjectAggregated_TaskLinkCleanupListener();

    await Promise.all([
        projectAggregator.init(),
        authProjectListener.init(),
        teamCleanupListener.init(),
        teamMemberCleanupListener.init(),
        taskCleanupListener.init(),
        taskLinkCleanupListener.init(),
    ]);

    logger.info('[Registry] All domain consumers and listeners initialized');
}
