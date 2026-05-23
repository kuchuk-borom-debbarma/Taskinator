import { db } from '../../../../database/index.ts';
import type { BehaviorRule } from '../../../../database/tables/BehaviorRule.ts';
import { logger } from '../../../../logger/index.ts';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/index.js';
import { cascadeService } from '../CascadeService.ts';

function matchesCriteria(taskData: any, rule: BehaviorRule): boolean {
    if (
        !rule.criteria_field ||
        !rule.criteria_operator ||
        rule.criteria_value === null ||
        rule.criteria_value === undefined
    ) {
        return true;
    }

    // Handle both flat data (created) and old/new state (updated)
    const currentData = taskData.new ?? taskData;
    const taskValue = currentData[rule.criteria_field];

    if (taskValue === undefined || taskValue === null) {
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

export class BehaviorTaskEventConsumer {
    async init() {
        logger.info('[BehaviorTaskEventConsumer] Initializing CWB consumer...');

        // Listen for Task events to trigger behavior cascades
        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'behavior-task-cascade-group',
            {
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskEvents.bind(this),
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskEvents.bind(this),
                [KAFKA_EVENTS.TASK.DELETED]: this.handleTaskEvents.bind(this),
            },
            { batch: true },
        );
    }

    public async handleTaskEvents(events: DomainEvent[]) {
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
                    // Check if rule specifies a single target task override
                    if (rule.fk_task_id && rule.fk_task_id !== taskId) {
                        continue;
                    }

                    if (matchesCriteria(event.data, rule)) {
                        try {
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
                                case 'PRIORITY_CASCADE': {
                                    const currentData =
                                        event.data.new ?? event.data;
                                    const newPriority = currentData.priority;
                                    if (
                                        newPriority !== undefined &&
                                        newPriority !== null
                                    ) {
                                        await cascadeService.cascadePriority({
                                            actorId,
                                            traceId,
                                            taskId,
                                            priority: Number(newPriority),
                                        });
                                    }
                                    break;
                                }
                                case 'TEAM_CASCADE': {
                                    const currentTeamData =
                                        event.data.new ?? event.data;
                                    if (currentTeamData.teamId !== undefined) {
                                        await cascadeService.cascadeTeam({
                                            actorId,
                                            traceId,
                                            taskId,
                                            teamId: currentTeamData.teamId,
                                        });
                                    }
                                    break;
                                }
                                case 'CASCADE_DELETE':
                                    if (
                                        event.type === KAFKA_EVENTS.TASK.DELETED
                                    ) {
                                        await cascadeService.cascadeDelete({
                                            actorId,
                                            traceId,
                                            taskId,
                                        });
                                    }
                                    break;
                                default:
                                    break;
                            }
                        } catch (err: any) {
                            logger.error(
                                `[BehaviorTaskEventConsumer] Failed execution of rule ${rule.id} (${rule.behavior_type})`,
                                err,
                            );
                        }
                    }
                }
            }
        }
    }
}
