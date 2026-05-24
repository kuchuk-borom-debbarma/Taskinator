import { db } from '../../../../infra/database/index.ts';
import { logger } from '../../../../infra/logger/index.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../infra/utils/event-bus/constants.ts';
import { taskService } from '../../index.ts';
import type { Task } from '../../TaskService.ts';
import {
    AUTOMATION_ACTIONS,
    AUTOMATION_CONDITIONS,
} from '../AutomationRegistry.ts';

type TaskUpdatedPayload = {
    taskId: string;
    projectId: string;
    old?: { status?: string | null };
    new?: { status?: string | null };
    actorId?: string | null;
};

/**
 * Asynchronous background listener that consumes task updated events from Kafka
 * and executes post-commit async status-changed automation rules.
 */
export class TaskAutomationListener {
    async init() {
        logger.info('[Task Automation] Initializing');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'task-automation-listener-group',
            {
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskUpdated.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskUpdated(
        events: DomainEvent<TaskUpdatedPayload>[],
    ): Promise<void> {
        for (const event of events) {
            const { old, new: next, projectId, taskId } = event.data;
            if (!next || old?.status === next.status) continue; // Only trigger if status actually changed

            await this.runStatusChangedRules(
                projectId,
                taskId,
                old?.status ?? null,
                next.status ?? null,
                event.data.actorId || 'system:automation',
            );
        }
    }

    /**
     * Executes async rules of type STATUS_CHANGED for the updated task.
     */
    private async runStatusChangedRules(
        projectId: string,
        taskId: string,
        fromStatus: string | null,
        toStatus: string | null,
        actorId: string,
    ): Promise<void> {
        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .where('trigger_type', '=', 'STATUS_CHANGED')
            .where('is_active', '=', true)
            .where('is_sync', '=', false)
            .execute();

        if (rules.length === 0) return;

        // Fetch task's full state
        const [task] = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .execute();

        if (!task) return;

        // Map database row to standard Task interface
        const publicTask: Task = {
            id: task.id,
            projectId: task.fk_project_id,
            teamId: task.fk_team_id,
            memberId: task.fk_member_id,
            title: task.title,
            description: task.description,
            status: task.status,
            version: task.version,
            createdBy: task.created_by,
            updatedBy: task.updated_by,
            priority: task.priority ?? 0,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            directIncomingCount: task.direct_incoming_count ?? 0,
            directOutgoingCount: task.direct_outgoing_count ?? 0,
            totalIncomingCount: task.total_incoming_count ?? 0,
            totalOutgoingCount: task.total_outgoing_count ?? 0,
            incomingLabelCounts:
                (task.incoming_label_counts as Record<string, number>) ?? {},
            outgoingLabelCounts:
                (task.outgoing_label_counts as Record<string, number>) ?? {},
        };

        for (const rule of rules) {
            let matches = true;
            if (rule.trigger_value) {
                try {
                    const cfg = JSON.parse(rule.trigger_value);
                    if (cfg.from && cfg.from !== fromStatus) matches = false;
                    if (cfg.to && cfg.to !== toStatus) matches = false;
                } catch (e) {
                    if (rule.trigger_value !== toStatus) matches = false;
                }
            }
            if (!matches) continue;

            const conditionFn =
                AUTOMATION_CONDITIONS[
                    rule.condition_type as keyof typeof AUTOMATION_CONDITIONS
                ];
            const actionFn =
                AUTOMATION_ACTIONS[
                    rule.action_type as keyof typeof AUTOMATION_ACTIONS
                ];

            if (!conditionFn || !actionFn) continue;

            const isMet = await conditionFn(publicTask, rule.condition_value);
            if (!isMet) continue;

            await actionFn(publicTask, rule.action_value, {
                actorId,
                taskService,
            });
        }
    }
}
