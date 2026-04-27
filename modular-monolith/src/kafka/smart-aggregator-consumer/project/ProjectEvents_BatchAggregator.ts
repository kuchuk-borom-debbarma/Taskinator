import { db } from '../../../database';
import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../utils/event-bus';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';
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

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'project-aggregator-group',
            );

            if (unprocessed.length === 0) {
                logger.info(
                    '[Project Coordinator] Batch already processed, skipping',
                );
                return;
            }

            logger.info(
                `[Project Coordinator] Processing batch of ${unprocessed.length} new events`,
            );

            // [1.5] Strict Chronological Sort
            const chronologicallyOrderedEvents = [...unprocessed].sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            );

            // [2] Semantic Folding (Cancellation Logic)
            const projectStates = new Map<
                string,
                ProjectState & {
                    membershipBalance: number;
                    removedUserIds: string[];
                }
            >();

            for (const event of chronologicallyOrderedEvents) {
                const { projectId, userId } = event.data;
                logger.debug(
                    `[Project Coordinator] Folding event ${event.type} for project ${projectId}, user ${userId}`,
                );

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

            // [3] Grouping & Filtering (Clean Data Preparation)
            const userIncrements = new Map<string, number>();
            const memberIncrements = new Map<string, number>();
            const deletedProjectIds: string[] = [];
            const memberRemovals: Map<string, string[]> = new Map();

            for (const state of projectStates.values()) {
                if (state.netBalance !== 0) {
                    userIncrements.set(
                        state.userId,
                        (userIncrements.get(state.userId) || 0) +
                            state.netBalance,
                    );
                }

                if (state.membershipBalance !== 0) {
                    memberIncrements.set(
                        state.projectId,
                        (memberIncrements.get(state.projectId) || 0) +
                            state.membershipBalance,
                    );
                }

                if (state.removedUserIds.length > 0) {
                    const existing = memberRemovals.get(state.projectId) || [];
                    memberRemovals.set(state.projectId, [
                        ...existing,
                        ...state.removedUserIds,
                    ]);
                }

                if (state.netBalance < 0) {
                    deletedProjectIds.push(state.projectId);
                }
            }

            // --- 4. Build all outbox entries (Pure Semantic Signals) ---
            const outboxEntries: OutboxEntry[] = [];

            for (const [userId, delta] of userIncrements.entries()) {
                // [Signal]: CHANGE_USER_PROJECT_COUNT
                // [Purpose]: Syncs the denormalized project count for a user (e.g., for "Total Projects" on Profile/Dashboard).
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

            for (const [projectId, delta] of memberIncrements.entries()) {
                // [Signal]: CHANGE_PROJECT_MEMBER_COUNT
                // [Purpose]: Syncs the denormalized member count on the Project entity itself for high-speed UI listing.
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

            for (const [projectId, userIds] of memberRemovals.entries()) {
                // [Signal]: REMOVE_PROJECT_MEMBER
                // [Purpose]: Removes specific user(s) from the Project Membership table.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .REMOVE_PROJECT_MEMBER,
                        projectId,
                        userIds,
                    },
                });

                // [Signal]: REMOVE_PROJECT_TEAM_MEMBER
                // [Purpose]: Cleanup: Removes the user(s) from all Teams associated with this project.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .REMOVE_PROJECT_TEAM_MEMBER,
                        projectId,
                        userIds,
                    },
                });

                // [Signal]: UNASSIGN_PROJECT_TASK_MEMBER
                // [Purpose]: Cleanup: Unassigns the user(s) from any Tasks they were assigned to within this project.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .UNASSIGN_PROJECT_TASK_MEMBER,
                        projectId,
                        userIds,
                    },
                });
            }

            // --- Project Deletion Cascade Logic ---
            if (deletedProjectIds.length > 0) {
                // [Signal]: DELETE_PROJECT_MEMBER
                // [Purpose]: Bulk purges all membership records for the deleted projects.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .DELETE_PROJECT_MEMBER,
                        projectIds: deletedProjectIds,
                    },
                });

                // [Signal]: DELETE_PROJECT_TEAM
                // [Purpose]: Bulk purges all Team definitions belonging to the deleted projects.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .DELETE_PROJECT_TEAM,
                        projectIds: deletedProjectIds,
                    },
                });

                // [Signal]: DELETE_PROJECT_TEAM_MEMBER
                // [Purpose]: Bulk purges all Team Membership links for the deleted projects.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .DELETE_PROJECT_TEAM_MEMBER,
                        projectIds: deletedProjectIds,
                    },
                });

                // [Signal]: DELETE_PROJECT_TASK
                // [Purpose]: Massive Cleanup: Purges all Tasks belonging to the deleted projects.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .DELETE_PROJECT_TASK,
                        projectIds: deletedProjectIds,
                    },
                });

                // [Signal]: DELETE_PROJECT_TASK_LINK
                // [Purpose]: Massive Cleanup: Purges all dependency links (A blocks B) within the projects.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .DELETE_PROJECT_TASK_LINK,
                        projectIds: deletedProjectIds,
                    },
                });

                // [Signal]: DELETE_PROJECT_TASK_REACHABILITY
                // [Purpose]: Massive Cleanup: Purges the entire Closure Table (transitive paths) for the deleted projects.
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED
                            .DELETE_PROJECT_TASK_REACHABILITY,
                        projectIds: deletedProjectIds,
                    },
                });
            }

            // [5] Single atomic write
            if (outboxEntries.length > 0) {
                await appendEventsToOutbox(trx, outboxEntries);
                logger.info(
                    `[Project Coordinator] Wrote ${outboxEntries.length} outbox entries for batch`,
                );
            }
        });
    }
}

//IMPORTANT: FUTURE Recursion event for large data to prevent database lock. If project has 1 million+ tasks deleting in one go will lock database. Instead, do it in batch and republish event
