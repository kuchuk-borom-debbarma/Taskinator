import { db } from '../../../database';
import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../utils/event-bus';
import {
    appendEventsToOutbox,
    type OutboxEntry,
} from '../../../utils/event-bus/OutboxQueries.ts';
import type { ProjectState } from './types.ts';

export class ProjectEvents_BatchAggregator {
    async init() {
        logger.info(
            '[ProjectEvents -> Aggregator] Initializing Smart Consumer',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT,
            'project-aggregator-group',
            {
                [KAFKA_EVENTS.PROJECT.CREATED]:
                    this.handleProjectBatch.bind(this),
                [KAFKA_EVENTS.PROJECT.DELETED]:
                    this.handleProjectBatch.bind(this),
                [KAFKA_EVENTS.PROJECT.MEMBERS_ADDED]:
                    this.handleProjectBatch.bind(this),
                [KAFKA_EVENTS.PROJECT.MEMBERS_REMOVED]:
                    this.handleProjectBatch.bind(this),
            },
            { batch: true },
        );
    }

    private async handleProjectBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        logger.info(
            `[Project Coordinator] Processing batch of ${events.length} events`,
        );

        // 1. Semantic Folding (Cancellation Logic)
        const projectStates = new Map<
            string,
            ProjectState & {
                membershipBalance: number;
                removedUserIds: string[];
            }
        >();

        for (const event of events) {
            const { projectId, userId } = event.data;
            const current = projectStates.get(projectId) || {
                projectId,
                userId,
                netBalance: 0,
                membershipBalance: 0,
                removedUserIds: [] as string[],
            };

            switch (event.type) {
                case KAFKA_EVENTS.PROJECT.CREATED:
                    current.netBalance += 1;
                    break;
                case KAFKA_EVENTS.PROJECT.DELETED:
                    current.netBalance -= 1;
                    break;
                case KAFKA_EVENTS.PROJECT.MEMBERS_ADDED:
                    current.membershipBalance +=
                        event.data.addedUserIds?.length || 0;
                    break;
                case KAFKA_EVENTS.PROJECT.MEMBERS_REMOVED: {
                    const removed = event.data.removedUserIds || [];
                    current.membershipBalance -= removed.length;
                    current.removedUserIds.push(...removed);
                    break;
                }
            }

            projectStates.set(projectId, current);
        }

        // 2. Grouping & Filtering (Clean Data Preparation)
        const userIncrements = new Map<string, number>();
        const memberIncrements = new Map<string, number>();
        const deletedProjectIds: string[] = [];
        const memberRemovals: Map<string, string[]> = new Map();

        for (const state of projectStates.values()) {
            // Lifecycle Counts (User Level)
            if (state.netBalance !== 0) {
                userIncrements.set(
                    state.userId,
                    (userIncrements.get(state.userId) || 0) + state.netBalance,
                );
            }

            // Membership Counts (Project Level)
            if (state.membershipBalance !== 0) {
                memberIncrements.set(
                    state.projectId,
                    (memberIncrements.get(state.projectId) || 0) +
                        state.membershipBalance,
                );
            }

            // Membership Cleanup (Cascading Cleanup)
            if (state.removedUserIds.length > 0) {
                const existing = memberRemovals.get(state.projectId) || [];
                memberRemovals.set(state.projectId, [
                    ...existing,
                    ...state.removedUserIds,
                ]);
            }

            // Project Deletion Cleanup
            if (state.netBalance < 0) {
                deletedProjectIds.push(state.projectId);
            }
        }

        // 3. Build all outbox entries (pure data, no I/O)
        // NOTE: We do NOT use specific kafka_keys here to maximize partition throughput.
        // Since these aggregated signals are either Commutative Deltas (counts) or
        // Idempotent Purges (cleanups), strictly ordered delivery per user/project
        // is not required, allowing for better load distribution across Kafka consumers.
        const outboxEntries: OutboxEntry[] = [];

        // User project count changes
        for (const [userId, delta] of userIncrements.entries()) {
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED
                        .CHANGE_USER_PROJECT_COUNT,
                    userId,
                    delta,
                },
            });
        }

        // Project member count changes
        for (const [projectId, delta] of memberIncrements.entries()) {
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED
                        .CHANGE_PROJECT_MEMBER_COUNT,
                    projectId,
                    delta,
                },
            });
        }

        // Member removal cleanup
        for (const [projectId, userIds] of memberRemovals.entries()) {
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED.REMOVE_PROJECT_MEMBER,
                    projectId,
                    userIds,
                },
            });
        }

        // Project deletion cleanup - cascading commands to other modules
        if (deletedProjectIds.length > 0) {
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TEAMS,
                    projectIds: deletedProjectIds,
                },
            });
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED
                        .DELETE_PROJECT_TEAM_MEMBERS,
                    projectIds: deletedProjectIds,
                },
            });
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TASKS,
                    projectIds: deletedProjectIds,
                },
            });
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED
                        .DELETE_PROJECT_TASK_LINKS,
                    projectIds: deletedProjectIds,
                },
            });
        }

        // 4. Single atomic write — throws on failure so Kafka does NOT ACK the batch
        await appendEventsToOutbox(db, outboxEntries);

        logger.info(
            `[Project Coordinator] Wrote ${outboxEntries.length} outbox entries for batch of ${events.length} events`,
        );
    }
}

//IMPORTANT: FUTURE Recursion event for large data to prevent database lock. If project has 1 million+ tasks deleting in one go will lock database. Instead, do it in batch and republish event
