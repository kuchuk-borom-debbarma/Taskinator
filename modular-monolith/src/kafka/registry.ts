import { ProjectTopicConsumer } from './consumers/ProjectTopicConsumer.ts';
import { ProjectAggregatedListener } from '../modules/auth/internal/listeners/ProjectAggregatedListener.ts';
import { logger } from '../logger';

/**
 * Event Processing Registry
 *
 * Manages the lifecycle of all domain-specific smart consumers and execution listeners.
 */
export async function startConsumers() {
    logger.info('[Registry] Starting domain event consumers...');

    const projectAggregator = new ProjectTopicConsumer();
    const authProjectListener = new ProjectAggregatedListener();

    await Promise.all([projectAggregator.init(), authProjectListener.init()]);

    logger.info('[Registry] All domain consumers and listeners initialized');
}
