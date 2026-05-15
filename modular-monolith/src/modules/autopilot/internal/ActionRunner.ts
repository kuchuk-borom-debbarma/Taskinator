import type { Kysely } from 'kysely';
import type { Database } from '../../../database/index.ts';
import { logger } from '../../../logger/index.ts';
import type { ActionHandler } from './ActionHandlers';
import type { AuditService } from './AuditService';

export class ActionRunner {
    constructor(
        private db: Kysely<Database>,
        private handlers: Record<string, ActionHandler>,
        private auditService: AuditService,
    ) {}

    async run(
        autopilotId: string,
        targetId: string,
        traceId: string,
        executionId?: string,
    ) {
        logger.info(
            `[ActionRunner] Starting execution for Autopilot ${autopilotId} (Target: ${targetId}, Trace: ${traceId}, Execution: ${executionId})`,
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

                if (executionId) {
                    await this.auditService.logStep({
                        executionId,
                        actionType: action.type,
                        status: 'SUCCESS',
                        position: action.position,
                    });
                }
            } catch (err) {
                logger.error(
                    `[ActionRunner] Action ${action.type} failed (Pos: ${action.position}):`,
                    err,
                );

                if (executionId) {
                    await this.auditService.logStep({
                        executionId,
                        actionType: action.type,
                        status: 'FAILURE',
                        position: action.position,
                        errorMessage:
                            err instanceof Error ? err.message : String(err),
                    });
                }

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
