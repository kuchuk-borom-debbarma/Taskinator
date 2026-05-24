import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import {
    aggregatorService,
    type DomainEvent,
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus';
import type { OutboxEntry } from '../../../utils/event-bus/OutboxQueries.ts';

/**
 * Team Smart Batch Aggregator
 *
 * Responsibilities:
 * 1. Fold raw Team/Member events to minimize downstream churn.
 * 2. Emit precise, action-oriented signals into TEAM_AGGREGATED topic.
 * 3. Atomic processing via AggregatorService and Transactional Outbox.
 */
export class TeamEvents_BatchAggregator {
    async init() {
        logger.info('[TeamEvents -> Aggregator] Initializing Smart Consumer');

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM,
            'team-aggregator-group',
            {
                [KAFKA_EVENTS.TEAM.CREATED]: this.handleTeamBatch.bind(this),
                [KAFKA_EVENTS.TEAM.DELETED]: this.handleTeamBatch.bind(this),
                [KAFKA_EVENTS.TEAM.MEMBERS_ADDED]:
                    this.handleTeamBatch.bind(this),
                [KAFKA_EVENTS.TEAM.MEMBERS_REMOVED]:
                    this.handleTeamBatch.bind(this),
                [KAFKA_EVENTS.TEAM.UPDATED]: this.handleTeamBatch.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTeamBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        await aggregatorService.processAggregatorBatch(
            'team-aggregator-group',
            events,
            (unprocessed) => {
                logger.info(
                    `[Team Coordinator] Processing batch of ${unprocessed.length} new events`,
                );

                // [1.5] Strict Chronological Sort
                const chronologicallyOrderedEvents = [...unprocessed].sort(
                    (a, b) =>
                        new Date(a.timestamp).getTime() -
                        new Date(b.timestamp).getTime(),
                );

                // [2] Semantic Folding (Cancellation Logic)
                const teamStates = new Map<
                    string,
                    {
                        teamId: string;
                        projectId: string;
                        lifecycleBalance: number; // +1 created, -1 deleted
                        membershipBalance: number; // +N added, -M removed
                        removedUserIds: string[];
                    }
                >();

                for (const event of chronologicallyOrderedEvents) {
                    const { teamId, projectId } = event.data;
                    const current = teamStates.get(teamId) || {
                        teamId,
                        projectId,
                        lifecycleBalance: 0,
                        membershipBalance: 0,
                        removedUserIds: [] as string[],
                    };

                    switch (event.type) {
                        case KAFKA_EVENTS.TEAM.CREATED:
                            current.lifecycleBalance += 1;
                            break;
                        case KAFKA_EVENTS.TEAM.DELETED:
                            current.lifecycleBalance -= 1;
                            break;
                        case KAFKA_EVENTS.TEAM.MEMBERS_ADDED:
                            current.membershipBalance +=
                                event.data.addedUserIds?.length || 0;
                            break;
                        case KAFKA_EVENTS.TEAM.MEMBERS_REMOVED: {
                            const removed = event.data.removedUserIds || [];
                            current.membershipBalance -= removed.length;
                            current.removedUserIds.push(...removed);
                            break;
                        }
                        case KAFKA_EVENTS.TEAM.UPDATED:
                            // No-op for counts, but could trigger other side effects in future
                            break;
                    }

                    teamStates.set(teamId, current);
                }

                // [3] Grouping & Data Preparation
                const projectTeamDeltas = new Map<string, number>();
                const teamMemberDeltas = new Map<string, number>();
                const deletedTeamIds: string[] = [];
                const memberRemovals = new Map<string, string[]>();

                for (const state of teamStates.values()) {
                    if (state.lifecycleBalance !== 0) {
                        projectTeamDeltas.set(
                            state.projectId,
                            (projectTeamDeltas.get(state.projectId) || 0) +
                                state.lifecycleBalance,
                        );
                    }

                    if (state.membershipBalance !== 0) {
                        teamMemberDeltas.set(
                            state.teamId,
                            (teamMemberDeltas.get(state.teamId) || 0) +
                                state.membershipBalance,
                        );
                    }

                    if (state.removedUserIds.length > 0) {
                        const existing = memberRemovals.get(state.teamId) || [];
                        memberRemovals.set(state.teamId, [
                            ...existing,
                            ...state.removedUserIds,
                        ]);
                    }

                    if (state.lifecycleBalance < 0) {
                        deletedTeamIds.push(state.teamId);
                    }
                }

                // [4] Build Outbox Signals
                const outboxEntries: OutboxEntry[] = [];

                for (const [projectId, delta] of projectTeamDeltas.entries()) {
                    // [Signal]: SYNC_PROJECT_TEAM_COUNT
                    // [Purpose]: Syncs the denormalized total team count for a project.
                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.TEAM_AGGREGATED
                                .SYNC_PROJECT_TEAM_COUNT,
                            projectId,
                            delta,
                        },
                    });
                }

                for (const [teamId, delta] of teamMemberDeltas.entries()) {
                    // [Signal]: SYNC_TEAM_MEMBER_COUNT
                    // [Purpose]: Syncs the denormalized total member count for a specific team.
                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.TEAM_AGGREGATED
                                .SYNC_TEAM_MEMBER_COUNT,
                            teamId,
                            delta,
                        },
                    });
                }

                for (const [teamId, userIds] of memberRemovals.entries()) {
                    // [Signal]: UNASSIGN_MEMBER_FROM_TEAM_TASKS
                    // [Purpose]: Cleanup: Unassigns specific user(s) from any tasks belonging to this team (e.g., when they leave the team).
                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.TEAM_AGGREGATED
                                .UNASSIGN_MEMBER_FROM_TEAM_TASKS,
                            teamId,
                            userIds,
                        },
                    });
                }

                if (deletedTeamIds.length > 0) {
                    // [Signal]: PURGE_TEAM_MEMBERSHIPS
                    // [Purpose]: Bulk Cleanup: Purges all membership records for the deleted teams.
                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.TEAM_AGGREGATED
                                .PURGE_TEAM_MEMBERSHIPS,
                            teamIds: deletedTeamIds,
                        },
                    });

                    // [Signal]: ORPHAN_TEAM_TASKS
                    // [Purpose]: Cleanup: Removes the team association (fk_team_id -> NULL) for any tasks that belonged to the deleted teams.
                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.TEAM_AGGREGATED
                                .ORPHAN_TEAM_TASKS,
                            teamIds: deletedTeamIds,
                        },
                    });
                }

                if (outboxEntries.length > 0) {
                    logger.info(
                        `[Team Coordinator] Wrote ${outboxEntries.length} signals for batch`,
                    );
                }

                return outboxEntries;
            },
        );
    }
}
