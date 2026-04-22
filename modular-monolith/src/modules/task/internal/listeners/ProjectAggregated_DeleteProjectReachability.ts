import { sql } from 'kysely';
import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';

/**
 * Task Module Listener: Project Deletion Reachability Cleanup
 *
 * Logic:
 * 1. Consumes DELETE_PROJECT_TASK_REACHABILITY from Project Aggregator.
 * 2. Hard deletes all transitive closure entries for the affected projects.
 */
export class ProjectAggregated_DeleteProjectReachability {
    async init() {
        logger.info(
            '[Task -> Project Cleanup] Initializing Reachability Purge Listener',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-project-reachability-purge-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED
                    .DELETE_PROJECT_TASK_REACHABILITY]:
                    this.handleProjectPurge.bind(this),
            },
        );
    }

    private async handleProjectPurge(data: { projectIds: string[] }) {
        const { projectIds } = data;

        if (!projectIds || projectIds.length === 0) return;

        logger.info(
            `[Graph Engine] Bulk purging reachability for ${projectIds.length} projects`,
        );

        await db.transaction().execute(async (trx) => {
            await sql`
                DELETE FROM task_reachability
                WHERE fk_project_id = ANY(${projectIds}::uuid[])
            `.execute(trx);
        });
    }
}
