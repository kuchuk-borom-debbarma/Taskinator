import type { Kysely } from 'kysely';
import type { Database } from '../../../database';
import { logger } from '../../../logger';
import type { ActionHandler } from './ActionHandlers';

export class ActionRunner {
    constructor(
        private db: Kysely<Database>,
        private handlers: Record<string, ActionHandler>,
    ) {}

    async run(autopilotId: string, targetId: string, traceId: string) {
        logger.info(
            `[ActionRunner] Starting execution for Autopilot ${autopilotId} (Target: ${targetId}, Trace: ${traceId})`,
        );

        const actions = await this.db
            .selectFrom('autopilot_action')
            .selectAll()
            .where('fk_autopilot_id', '=', autopilotId)
            .orderBy('position', 'asc')
            .execute();

        if (actions.length === 0) {
            logger.debug(
                `[ActionRunner] No actions found for Autopilot ${autopilotId}`,
            );
            return;
        }

        logger.info(
            `[ActionRunner] Found ${actions.length} actions to execute`,
        );

        for (const action of actions) {
            const handler = this.handlers[action.type];

            if (!handler) {
                logger.error(
                    `[ActionRunner] No handler found for action type: ${action.type}. Stopping chain.`,
                );
                return;
            }

            try {
                logger.debug(
                    `[ActionRunner] Executing action: ${action.type} (Pos: ${action.position})`,
                );
                await handler(targetId, action.config, { traceId });
            } catch (err) {
                logger.error(
                    `[ActionRunner] Action ${action.type} failed (Pos: ${action.position}):`,
                    err,
                );
                logger.info(
                    `[ActionRunner] Sequential chain stopped due to failure.`,
                );
                return; // Stop on failure as requested
            }
        }

        logger.info(
            `[ActionRunner] Successfully completed all actions for Autopilot ${autopilotId}`,
        );
    }
}
