import { type Kysely, sql } from 'kysely';
import type { Database } from '../../../database/index.ts';
import { logger } from '../../../logger/index.ts';
import type { ActionRunner } from './ActionRunner';
import type { AuditService } from './AuditService';
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
        private actionRunner: ActionRunner,
        private auditService: AuditService,
    ) {}

    private static readonly MAX_DEPTH = 10;

    async processEvent(event: AutopilotEvent) {
        const { type: eventType, payload } = event;
        const { traceId } = event;

        // 0. Loop Detection
        const { rootId, depth } = this.parseTrace(traceId);
        if (depth >= AutopilotEngine.MAX_DEPTH) {
            logger.warn(
                `[AutopilotEngine] Loop detected! Max depth reached for trace ${rootId} (Depth: ${depth}). Stopping execution.`,
            );
            return;
        }

        // Increment depth for this execution chain
        const nextTraceId = `${rootId}:${depth + 1}`;

        logger.info(
            `[AutopilotEngine] Processing event: ${eventType} (Trace: ${nextTraceId})`,
        );

        const projectId = payload.projectId;

        // 1. Trigger Matching
        let query = this.db
            .selectFrom('autopilot')
            .selectAll()
            .where('is_active', '=', true)
            .where(sql<boolean>`${eventType} = ANY(triggers)`);

        if (projectId) {
            query = query.where('fk_project_id', '=', projectId);
        }

        const matchingAutopilots = await query.execute();

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
                await this.evaluateAutopilot(autopilot, {
                    ...event,
                    traceId: nextTraceId,
                });
            } catch (err) {
                logger.error(
                    `[AutopilotEngine] Error evaluating autopilot ${autopilot.id}:`,
                    err,
                );
            }
        }
    }

    private parseTrace(traceId: string): { rootId: string; depth: number } {
        if (!traceId) {
            return { rootId: `trace-${Date.now()}`, depth: 0 };
        }
        const parts = traceId.split(':');
        if (parts.length === 2) {
            const depth = parseInt(parts[1], 10);
            return { rootId: parts[0], depth: Number.isNaN(depth) ? 0 : depth };
        }
        return { rootId: traceId, depth: 0 };
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

        // Start Audit Log
        const executionId = await this.auditService.startExecution({
            autopilotId: autopilot.id,
            targetId: entityId,
            traceId,
            triggerEvent: eventType,
        });

        try {
            // 3. Build Context
            const context = await this.contextService.buildContext(
                domain,
                entityId,
                payload,
            );
            context.traceId = traceId;

            // 4. Evaluate Conditions
            const conditions = autopilot.conditions as ConditionTree;
            const isMatch = this.conditionEvaluator.evaluate(
                conditions,
                context,
            );

            if (isMatch) {
                logger.info(
                    `[AutopilotEngine] Match found for Autopilot: ${autopilot.id} (Trace: ${traceId})`,
                );
                await this.auditService.updateStatus(executionId, 'MATCHED');
                await this.actionRunner.run(
                    autopilot.id,
                    entityId,
                    traceId,
                    executionId,
                );
                await this.auditService.updateStatus(executionId, 'COMPLETED');
            } else {
                logger.debug(
                    `[AutopilotEngine] Condition not met for Autopilot: ${autopilot.id}`,
                );
                await this.auditService.updateStatus(executionId, 'SKIPPED');
            }
        } catch (err) {
            logger.error(
                `[AutopilotEngine] Execution ${executionId} failed:`,
                err,
            );
            await this.auditService.updateStatus(executionId, 'FAILED');
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
