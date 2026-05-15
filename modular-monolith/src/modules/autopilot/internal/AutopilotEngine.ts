import { type Kysely, sql } from 'kysely';
import type { Database } from '../../../database/index.ts';
import { logger } from '../../../logger/index.ts';
import type { ConditionEvaluator } from './ConditionEvaluator';
import type { ConditionTree } from './ConditionTypes';
import type { ContextService } from './ContextService';

export interface AutopilotEvent {
    type: string;
    payload: Record<string, any>;
    traceId: string;
}

export class AutopilotEngine {
    constructor(
        private db: Kysely<Database>,
        private contextService: ContextService,
        private conditionEvaluator: ConditionEvaluator,
    ) {}

    async processEvent(event: AutopilotEvent) {
        const { type: eventType, payload, traceId } = event;

        logger.info(
            `[AutopilotEngine] Processing event: ${eventType} (Trace: ${traceId})`,
        );

        // 1. Trigger Matching
        const matchingAutopilots = await this.db
            .selectFrom('autopilot')
            .selectAll()
            .where('is_active', '=', true)
            .where(sql<boolean>`${eventType} = ANY(triggers)`)
            .execute();

        if (matchingAutopilots.length === 0) {
            logger.debug(
                `[AutopilotEngine] No matching autopilots for event: ${eventType}`,
            );
            return;
        }

        logger.debug(
            `[AutopilotEngine] Found ${matchingAutopilots.length} matching autopilots`,
        );

        // 2. Sequential Evaluation
        for (const autopilot of matchingAutopilots) {
            try {
                await this.evaluateAutopilot(autopilot, event);
            } catch (err) {
                logger.error(
                    `[AutopilotEngine] Error evaluating autopilot ${autopilot.id}:`,
                    err,
                );
            }
        }
    }

    private async evaluateAutopilot(autopilot: any, event: AutopilotEvent) {
        const { type: eventType, payload, traceId } = event;
        const domain = this.resolveDomain(eventType);
        const entityId = this.resolveEntityId(eventType, payload);

        if (!domain || !entityId) {
            logger.warn(
                `[AutopilotEngine] Could not resolve domain/ID for event ${eventType}`,
            );
            return;
        }

        // 3. Build Context
        const context = await this.contextService.buildContext(
            domain,
            entityId,
            payload,
        );
        context.traceId = traceId;

        // 4. Evaluate Conditions
        const conditions = autopilot.conditions as ConditionTree;
        const isMatch = this.conditionEvaluator.evaluate(conditions, context);

        if (isMatch) {
            logger.info(
                `[AutopilotEngine] Match found for Autopilot: ${autopilot.id} (Trace: ${traceId})`,
            );
            // TODO: Trigger Action Chain (Phase 4)
        } else {
            logger.debug(
                `[AutopilotEngine] Condition not met for Autopilot: ${autopilot.id}`,
            );
        }
    }

    private resolveDomain(eventType: string): string | null {
        if (eventType.startsWith('task.')) return 'task';
        if (eventType.startsWith('project.')) return 'project';
        return null;
    }

    private resolveEntityId(
        eventType: string,
        payload: Record<string, any>,
    ): string | null {
        if (eventType.startsWith('task.')) return payload.taskId || payload.id;
        if (eventType.startsWith('project.'))
            return payload.projectId || payload.id;
        return null;
    }
}
