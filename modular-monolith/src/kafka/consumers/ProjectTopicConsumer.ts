import eventBus from '../../utils/EventBus.ts';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../utils/event-bus/types.ts';
import { logger } from '../../logger';

export class ProjectTopicConsumer {
    async init() {
        logger.info(
            '[Project Aggregator] Initializing Smart Consumer for project-events',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT,
            'project-aggregator-group',
            {
                [KAFKA_EVENTS.PROJECT.CREATED]:
                    this.handleProjectBatch.bind(this),
                [KAFKA_EVENTS.PROJECT.DELETED]:
                    this.handleProjectBatch.bind(this),
            },
            { batch: true },
        );
    }

    private async handleProjectBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        logger.info(
            `[Project Aggregator] Processing batch of ${events.length} events`,
        );

        // 1. Semantic Folding (Cancellation Logic)
        // We track the net lifecycle state of each project in this batch.
        // If a project is created and then deleted, the net impact is 0.
        const projectStates = new Map<
            string,
            { userId: string; netBalance: number }
        >();

        for (const event of events) {
            const { projectId, userId } = event.data;
            const current = projectStates.get(projectId) || {
                userId,
                netBalance: 0,
            };

            if (event.type === KAFKA_EVENTS.PROJECT.CREATED) {
                current.netBalance += 1;
            } else if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                current.netBalance -= 1;
            }

            projectStates.set(projectId, current);
        }

        // 2. Aggregate per User
        // Now we calculate how many projects each user net-gained or net-lost.
        const userIncrements: Record<string, number> = {};

        for (const [projectId, state] of projectStates.entries()) {
            if (state.netBalance === 0) {
                logger.info(
                    `[Project Aggregator] Operation cancelled for project ${projectId} (Created + Deleted in same batch)`,
                );
                continue;
            }

            userIncrements[state.userId] =
                (userIncrements[state.userId] || 0) + state.netBalance;
        }

        // 3. Non-Blocking Dispatch (Batch)
        // We publish an array of events, one per user, keyed by userId for better Kafka partitioning.
        const userEntries = Object.entries(userIncrements);
        if (userEntries.length > 0) {
            logger.info(
                `[Project Aggregator] Dispatching ${userEntries.length} per-user increment events`,
            );

            const eventsToPublish = userEntries.map(([userId, delta]) => ({
                key: userId, // Ensure all events for this user go to the same partition
                data: { userId, delta },
            }));

            await eventBus.publish(
                KAFKA_TOPICS.PROJECT_AGGREGATED,
                KAFKA_EVENTS.PROJECT_AGGREGATED.COUNTS_CHANGED,
                eventsToPublish,
            );
        } else {
            logger.info(
                '[Project Aggregator] Batch resulted in zero net changes after folding',
            );
        }
    }
}
