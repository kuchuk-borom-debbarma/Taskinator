import { db } from '../../../../database/index.ts';
import type { BehaviorRule } from '../../../../database/tables/BehaviorRule.ts';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { cascadeService } from '../../../task/internal/CascadeService.ts';

function matchesCriteria(taskData: any, rule: BehaviorRule): boolean {
    if (
        !rule.criteria_field ||
        !rule.criteria_operator ||
        rule.criteria_value === null
    ) {
        return true;
    }

    // Handle both flat data (created) and old/new state (updated)
    const currentData = taskData.new ?? taskData;
    const taskValue = currentData[rule.criteria_field];

    if (taskValue === undefined) {
        return false;
    }

    let left: any = taskValue;
    let right: any = rule.criteria_value;

    if (!Number.isNaN(Number(left)) && !Number.isNaN(Number(right))) {
        left = Number(left);
        right = Number(right);
    }

    switch (rule.criteria_operator) {
        case 'EQUALS':
            return left === right;
        case 'NOT_EQUALS':
            return left !== right;
        case 'GREATER_THAN':
            return left > right;
        case 'LESS_THAN':
            return left < right;
        default:
            return false;
    }
}

export class AutoActionTaskEventConsumer {
    async init() {
        logger.info('[AutoAction -> Task Event Consumer] Initializing');

        // Listen for Task events to trigger new auto-actions
        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'auto-action-task-trigger-group',
            {
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskEvents.bind(this),
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskEvents.bind(this),
                [KAFKA_EVENTS.TASK.DELETED]: this.handleTaskEvents.bind(this),
            },
            { batch: true },
        );

        // Listen for Auto Action internal events (e.g. PIPELINE.CONTINUE) for resumable execution (RES-02)
        await eventBus.subscribe(
            KAFKA_TOPICS.AUTO_ACTION,
            'auto-action-internal-group',
            {
                [KAFKA_EVENTS.PIPELINE.CONTINUE]:
                    this.handleTaskEvents.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskEvents(events: DomainEvent[]) {
        // Process behavior cascades
        for (const event of events) {
            if (
                event.type === KAFKA_EVENTS.TASK.CREATED ||
                event.type === KAFKA_EVENTS.TASK.UPDATED ||
                event.type === KAFKA_EVENTS.TASK.DELETED
            ) {
                const { projectId, taskId, actorId, traceId } = event.data;
                if (!projectId || !taskId || !actorId) continue;

                // Fetch active behavior rules for the project
                const rules = await db
                    .selectFrom('behavior_rule')
                    .selectAll()
                    .where('fk_project_id', '=', projectId)
                    .where('is_active', '=', true)
                    .execute();

                for (const rule of rules) {
                    if (matchesCriteria(event.data, rule)) {
                        switch (rule.behavior_type) {
                            case 'BLOCKER_RESOLUTION':
                                if (rule.action_value) {
                                    await cascadeService.resolveBlockers({
                                        actorId,
                                        traceId,
                                        taskId,
                                        targetStatus: rule.action_value,
                                    });
                                }
                                break;
                            case 'PRIORITY_CASCADE':
                                if (
                                    rule.action_value !== null &&
                                    rule.action_value !== undefined &&
                                    !Number.isNaN(Number(rule.action_value))
                                ) {
                                    await cascadeService.cascadePriority({
                                        actorId,
                                        traceId,
                                        taskId,
                                        priority: Number(rule.action_value),
                                    });
                                }
                                break;
                            case 'TEAM_CASCADE':
                                await cascadeService.cascadeTeam({
                                    actorId,
                                    traceId,
                                    taskId,
                                    teamId: rule.action_value,
                                });
                                break;
                            case 'CASCADE_DELETE':
                                await cascadeService.cascadeDelete({
                                    actorId,
                                    traceId,
                                    taskId,
                                });
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
    }
}
