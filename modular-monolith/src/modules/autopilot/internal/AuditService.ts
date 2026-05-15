import { type Kysely, sql } from 'kysely';
import type { Database } from '../../../database/index.ts';
import { logger } from '../../../logger/index.ts';
import eventBus from '../../../utils/EventBus.ts';

export class AuditService {
    constructor(private db: Kysely<Database>) {}

    async startExecution(param: {
        autopilotId: string;
        targetId: string;
        traceId: string;
        triggerEvent: string;
    }): Promise<string> {
        const result = await this.db
            .insertInto('autopilot_execution')
            .values({
                fk_autopilot_id: param.autopilotId,
                fk_target_id: param.targetId,
                trace_id: param.traceId,
                trigger_event: param.triggerEvent,
                status: 'STARTED',
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        this.broadcastUpdate(result.id, 'STARTED');
        return result.id;
    }

    async updateStatus(executionId: string, status: string) {
        await this.db
            .updateTable('autopilot_execution')
            .set({ status })
            .where('id', '=', executionId)
            .execute();

        this.broadcastUpdate(executionId, status);
    }

    async logStep(param: {
        executionId: string;
        actionType: string;
        status: 'SUCCESS' | 'FAILURE';
        position: number;
        errorMessage?: string;
    }) {
        await this.db
            .insertInto('autopilot_step_log')
            .values({
                fk_execution_id: param.executionId,
                action_type: param.actionType,
                status: param.status,
                position: param.position,
                error_message: param.errorMessage || null,
            })
            .execute();

        this.broadcastStep(param.executionId, param);
    }

    async cleanupOldLogs(days: number = 30) {
        const result = await this.db
            .deleteFrom('autopilot_execution')
            .where('created_at', '<', sql`NOW() - INTERVAL '${days} days'`)
            .executeTakeFirst();

        logger.info(
            `[AuditService] Cleaned up old audit logs. Deleted: ${result.numDeletedRows}`,
        );
    }

    private broadcastUpdate(executionId: string, status: string) {
        eventBus.publish('autopilot-events', 'autopilot.execution.updated', {
            executionId,
            status,
            timestamp: new Date().toISOString(),
        });
    }

    private broadcastStep(executionId: string, step: any) {
        eventBus.publish('autopilot-events', 'autopilot.step.created', {
            executionId,
            ...step,
            timestamp: new Date().toISOString(),
        });
    }
}
