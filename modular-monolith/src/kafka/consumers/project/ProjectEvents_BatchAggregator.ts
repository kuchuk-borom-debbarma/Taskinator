import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';
import { logger } from '../../../logger';
import type { ProjectState } from './types.ts';
import { UserProjectCountHandler } from './handlers/UserProjectCountHandler.ts';
import { ProjectMemberCountHandler } from './handlers/ProjectMemberCountHandler.ts';
import { ProjectMemberCleanupHandler } from './handlers/ProjectMemberCleanupHandler.ts';
import { ProjectCleanupHandler } from './handlers/ProjectCleanupHandler.ts';

export class ProjectEvents_BatchAggregator {
    private countHandler = new UserProjectCountHandler();
    private memberCountHandler = new ProjectMemberCountHandler();
    private memberCleanupHandler = new ProjectMemberCleanupHandler();
    private cleanupHandler = new ProjectCleanupHandler();

    async init() {
        logger.info(
            '[ProjectEvents -> Aggregator] Initializing Smart Consumer with handlers:',
            'UserProjectCountHandler, ProjectCleanupHandler',
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
                case KAFKA_EVENTS.PROJECT.MEMBERS_REMOVED:
                    const removed = event.data.removedUserIds || [];
                    current.membershipBalance -= removed.length;
                    current.removedUserIds.push(...removed);
                    break;
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
                const currentDelta = userIncrements.get(state.userId) || 0;
                userIncrements.set(
                    state.userId,
                    currentDelta + state.netBalance,
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

        // 3. Delegate Clean Data to Handlers
        await Promise.all([
            this.countHandler.handle(userIncrements).catch((err: any) => {
                logger.error(
                    '[Project Coordinator] Count handler failed:',
                    err,
                );
            }),
            this.memberCountHandler
                .handle(memberIncrements)
                .catch((err: any) => {
                    logger.error(
                        '[Project Coordinator] Member count handler failed:',
                        err,
                    );
                }),
            ...Array.from(memberRemovals.entries()).map(([pid, uids]) =>
                this.memberCleanupHandler
                    .handle(pid, uids)
                    .catch((err: any) => {
                        logger.error(
                            '[Project Coordinator] Member cleanup handler failed:',
                            err,
                        );
                    }),
            ),
            this.cleanupHandler.handle(deletedProjectIds).catch((err: any) => {
                logger.error(
                    '[Project Coordinator] Cleanup handler failed:',
                    err,
                );
            }),
        ]);
    }
}

//IMPORTANT: Recursion event for large data to prevent database lock. If project has 1 million+ tasks deleting in one go will lock database. Instead, do it in batch and republish event
