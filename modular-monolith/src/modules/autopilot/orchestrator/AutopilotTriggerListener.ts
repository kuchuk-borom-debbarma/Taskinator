/**
 * Bridges domain events (task.created, task.updated, etc.) into pipeline.trigger
 * events for active autopilot rules in the same project.
 */

import { db } from '../../../database/index.js';
import { logger } from '../../../logger/index.js';
import eventBus from '../../../utils/EventBus.ts';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../utils/event-bus/index.js';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../utils/event-bus/index.js';
import { appendEventsToOutbox } from '../../../utils/event-bus/OutboxQueries.ts';

type TaskEventPayload = {
    type?: string;
    taskId?: string;
    projectId?: string;
    old?: Record<string, any>;
    new?: Record<string, any>;
};

export class AutopilotTriggerListener {
    async init() {
        logger.info('[AutopilotTriggerListener] Initializing task triggers...');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'autopilot-trigger-router-group',
            {
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskEvents.bind(this),
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskEvents.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskEvents(events: DomainEvent<TaskEventPayload>[]) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'autopilot-trigger-router-group',
            );

            if (unprocessed.length === 0) return;

            const outboxEntries: Array<{
                kafka_topic: string;
                kafka_key: string | null;
                payload: any;
            }> = [];

            for (const event of unprocessed) {
                const payload = event.data;
                if (!payload.projectId || !payload.taskId) continue;
                const triggerTypes = getTaskTriggerTypes(event);

                const rules = await trx
                    .selectFrom('autopilot')
                    .select(['id', 'triggers'])
                    .where('fk_project_id', '=', payload.projectId)
                    .where('is_active', '=', true)
                    .execute();

                for (const rule of rules) {
                    const triggers = Array.isArray(rule.triggers)
                        ? rule.triggers
                        : [];
                    if (
                        !triggers.some((trigger) => triggerTypes.has(trigger))
                    ) {
                        continue;
                    }

                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.AUTOPILOT,
                        kafka_key: rule.id,
                        payload: {
                            type: KAFKA_EVENTS.PIPELINE.TRIGGER,
                            data: {
                                autopilotId: rule.id,
                                entityType: 'project_task',
                                entityId: payload.taskId,
                                snapshot: payload.old,
                                isRecursiveTrigger: false,
                                depth: 0,
                            },
                        },
                    });
                }
            }

            await appendEventsToOutbox(trx, outboxEntries);
        });
    }
}

function getTaskTriggerTypes(
    event: DomainEvent<TaskEventPayload>,
): Set<string> {
    const types = new Set<string>([event.type]);

    if (event.type === KAFKA_EVENTS.TASK.UPDATED) {
        const oldState = event.data.old ?? {};
        const newState = event.data.new ?? {};

        if (oldState.status !== newState.status) {
            types.add('task.status_changed');
        }

        if (oldState.memberId !== newState.memberId && newState.memberId) {
            types.add('task.assigned');
        }
    }

    return types;
}
