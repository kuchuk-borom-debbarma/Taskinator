import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';
import { ProjectTeamCountHandler } from './handlers/ProjectTeamCountHandler.ts';
import { TeamCleanupHandler } from './handlers/TeamCleanupHandler.ts';
import { TeamMemberCleanupHandler } from './handlers/TeamMemberCleanupHandler.ts';
import { TeamMemberCountHandler } from './handlers/TeamMemberCountHandler.ts';

/**
 * Coordinator for Team Domain events.
 * Manages semantic folding for:
 * 1. Team Lifecycles (Create/Delete -> Project counters)
 * 2. Team Membership (Add/Remove -> Team counters)
 */
export class TeamEvents_BatchAggregator {
    private projectCountHandler = new ProjectTeamCountHandler();
    private memberCountHandler = new TeamMemberCountHandler();
    private memberCleanupHandler = new TeamMemberCleanupHandler();
    private cleanupHandler = new TeamCleanupHandler();

    async init() {
        logger.info(
            '[TeamEvents -> Aggregator] Initializing Smart Consumer for team-events',
        );

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
            `[TeamEvents -> Aggregator] Processing batch of ${events.length} events`,
        );

        // 1. Group State per Entity
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

        // 2. Aggregate Results (Clean Data)
        const netProjectDeltas = new Map<string, number>();
        const netTeamMemberDeltas = new Map<string, number>();
        const deletedTeamIds: string[] = [];
        const memberRemovals = new Map<string, string[]>();

        for (const state of teamStates.values()) {
            // Lifecycle Aggregation (Project Level)
            if (state.lifecycleBalance !== 0) {
                const current = netProjectDeltas.get(state.projectId) || 0;
                netProjectDeltas.set(
                    state.projectId,
                    current + state.lifecycleBalance,
                );
            }

            // Membership Aggregation (Team Level)
            if (state.membershipBalance !== 0) {
                const current = netTeamMemberDeltas.get(state.teamId) || 0;
                netTeamMemberDeltas.set(
                    state.teamId,
                    current + state.membershipBalance,
                );
            }

            // Signal for Cleanup
            if (state.lifecycleBalance < 0) {
                deletedTeamIds.push(state.teamId);
            }

            // Member Cleanup
            if (state.removedUserIds.length > 0) {
                const existing = memberRemovals.get(state.teamId) || [];
                memberRemovals.set(state.teamId, [
                    ...existing,
                    ...state.removedUserIds,
                ]);
            }
        }

        // 3. Delegate to Specialized Handlers
        await Promise.all([
            this.projectCountHandler
                .handle(netProjectDeltas)
                .catch((err: any) => {
                    logger.error(
                        '[Team Aggregator] Project count handler failed:',
                        err,
                    );
                }),
            this.memberCountHandler
                .handle(netTeamMemberDeltas)
                .catch((err: any) => {
                    logger.error(
                        '[Team Aggregator] Member count handler failed:',
                        err,
                    );
                }),
            ...Array.from(memberRemovals.entries()).map(([tid, uids]) =>
                this.memberCleanupHandler
                    .handle(tid, uids)
                    .catch((err: any) => {
                        logger.error(
                            '[Team Aggregator] Member cleanup handler failed:',
                            err,
                        );
                    }),
            ),
            this.cleanupHandler.handle(deletedTeamIds).catch((err: any) => {
                logger.error('[Team Aggregator] Cleanup handler failed:', err);
            }),
        ]);
    }
}
