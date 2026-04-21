import { db } from '../../../database';
import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../utils/event-bus';
import {
    appendEventsToOutbox,
    type OutboxEntry,
} from '../../../utils/event-bus/OutboxQueries.ts';

/**
 * Team Smart Batch Aggregator
 *
 * Responsibilities:
 * 1. Fold raw Team/Member events to minimize downstream churn.
 * 2. Emit precise, action-oriented signals into TEAM_AGGREGATED topic.
 * 3. Atomic processing via Transactional Outbox (appendEventsToOutbox).
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
            },
            { batch: true },
        );
    }

    private async handleTeamBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        logger.info(
            `[Team Coordinator] Processing batch of ${events.length} events`,
        );

        // 1. Semantic Folding (Cancellation Logic)
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

        for (const event of events) {
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
            }

            teamStates.set(teamId, current);
        }

        // 2. Grouping & Data Preparation
        const projectTeamDeltas = new Map<string, number>();
        const teamMemberDeltas = new Map<string, number>();
        const deletedTeamIds: string[] = [];
        const memberRemovals = new Map<string, string[]>();

        for (const state of teamStates.values()) {
            // Project Level: Team Count Changes
            if (state.lifecycleBalance !== 0) {
                projectTeamDeltas.set(
                    state.projectId,
                    (projectTeamDeltas.get(state.projectId) || 0) +
                        state.lifecycleBalance,
                );
            }

            // Team Level: Member Count Changes
            if (state.membershipBalance !== 0) {
                teamMemberDeltas.set(
                    state.teamId,
                    (teamMemberDeltas.get(state.teamId) || 0) +
                        state.membershipBalance,
                );
            }

            // Explicit Member Removal (Cleanup)
            if (state.removedUserIds.length > 0) {
                const existing = memberRemovals.get(state.teamId) || [];
                memberRemovals.set(state.teamId, [
                    ...existing,
                    ...state.removedUserIds,
                ]);
            }

            // Team Lifecycle Deletion (Cleanup)
            if (state.lifecycleBalance < 0) {
                deletedTeamIds.push(state.teamId);
            }
        }

        // 3. Build Outbox Signals
        const outboxEntries: OutboxEntry[] = [];

        // Signal: Sync Project Team Count
        for (const [projectId, delta] of projectTeamDeltas.entries()) {
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.TEAM_AGGREGATED.SYNC_PROJECT_TEAM_COUNT,
                    projectId,
                    delta,
                },
            });
        }

        // Signal: Sync Team Member Count
        for (const [teamId, delta] of teamMemberDeltas.entries()) {
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.TEAM_AGGREGATED.SYNC_TEAM_MEMBER_COUNT,
                    teamId,
                    delta,
                },
            });
        }

        // Signal: Unassign Member from Team Tasks
        for (const [teamId, userIds] of memberRemovals.entries()) {
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

        // Signal: Decommissioning Cleanup (Team Deleted)
        if (deletedTeamIds.length > 0) {
            // [Team Module] Purge memberships
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.TEAM_AGGREGATED.PURGE_TEAM_MEMBERSHIPS,
                    teamIds: deletedTeamIds,
                },
            });

            // [Task Module] Orphan tasks (NULL out team_id)
            outboxEntries.push({
                kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                payload: {
                    type: KAFKA_EVENTS.TEAM_AGGREGATED.ORPHAN_TEAM_TASKS,
                    teamIds: deletedTeamIds,
                },
            });
        }

        // 4. Atomic Sink
        await appendEventsToOutbox(db, outboxEntries);

        logger.info(
            `[Team Coordinator] Wrote ${outboxEntries.length} signals for batch of ${events.length} events`,
        );
    }
}
