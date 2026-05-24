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
            if (old?.status === 'DONE' || next?.status !== 'DONE') continue;

            await this.runPrerequisiteCompletedRules(
                projectId,
                taskId,
                event.data.actorId || 'system:automation',
            );
        }
    }

    private async runPrerequisiteCompletedRules(
        projectId: string,
        completedTaskId: string,
        actorId: string,
    ): Promise<void> {
        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .where('trigger_type', '=', 'PREREQUISITE_COMPLETED')
            .where('is_active', '=', true)
            .where('is_sync', '=', false)
            .execute();

        if (rules.length === 0) return;

        const downstreamTasks = await this.getDownstreamTasks(
            projectId,
            completedTaskId,
        );

        for (const task of downstreamTasks) {
            for (const rule of rules) {
                const conditionFn =
                    AUTOMATION_CONDITIONS[
                        rule.condition_type as keyof typeof AUTOMATION_CONDITIONS
                    ];
                const actionFn =
                    AUTOMATION_ACTIONS[
                        rule.action_type as keyof typeof AUTOMATION_ACTIONS
                    ];

                if (!conditionFn || !actionFn) continue;

                const isMet = await conditionFn(task, rule.condition_value);
                if (!isMet) continue;

                await actionFn(task, rule.action_value, {
                    actorId,
                    taskService,
                });
            }
        }
    }

    private async getDownstreamTasks(
        projectId: string,
        completedTaskId: string,
    ): Promise<Task[]> {
        const rows = await db
            .selectFrom('task_reachability')
            .innerJoin(
                'project_task',
                'project_task.id',
                'task_reachability.descendant_task_id',
            )
            .select([
                'project_task.id as id',
                'project_task.fk_project_id as projectId',
                'project_task.fk_team_id as teamId',
                'project_task.fk_member_id as memberId',
                'project_task.title as title',
                'project_task.description as description',
                'project_task.status as status',
                'project_task.version as version',
                'project_task.created_by as createdBy',
                'project_task.updated_by as updatedBy',
                'project_task.priority as priority',
                'project_task.created_at as createdAt',
                'project_task.updated_at as updatedAt',
                'project_task.direct_incoming_count as directIncomingCount',
                'project_task.direct_outgoing_count as directOutgoingCount',
                'project_task.total_incoming_count as totalIncomingCount',
                'project_task.total_outgoing_count as totalOutgoingCount',
                'project_task.incoming_label_counts as incomingLabelCounts',
                'project_task.outgoing_label_counts as outgoingLabelCounts',
            ])
            .where('task_reachability.fk_project_id', '=', projectId)
            .where('task_reachability.ancestor_task_id', '=', completedTaskId)
            .where('task_reachability.depth', '>', 0)
            .execute();

        return rows as Task[];
    }
}
