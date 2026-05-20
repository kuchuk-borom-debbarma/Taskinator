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
    actorId?: string;
    traceId?: string;
    depth?: number;
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

        logger.info(
            `[AutopilotTriggerListener] Received batch of ${events.length} task events`,
        );

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'autopilot-trigger-router-group',
            );

            logger.info(
                `[AutopilotTriggerListener] Filtered unprocessed events count: ${unprocessed.length}/${events.length}`,
            );
            if (unprocessed.length === 0) return;

            const outboxEntries: Array<{
                kafka_topic: string;
                kafka_key: string | null;
                payload: any;
            }> = [];

            for (const event of unprocessed) {
                const payload = event.data;
                logger.info(
                    `[AutopilotTriggerListener] Processing task event: id=${event.eventId}, type=${event.type}, taskId=${payload.taskId}, projectId=${payload.projectId}`,
                );
                if (!payload.projectId || !payload.taskId) {
                    logger.warn(
                        `[AutopilotTriggerListener] Event skipped: missing projectId or taskId`,
                    );
                    continue;
                }
                const triggerTypes = getTaskTriggerTypes(event);
                logger.debug(
                    `[AutopilotTriggerListener] Resolved trigger types for event: [${Array.from(triggerTypes).join(', ')}]`,
                );

                const rules = await trx
                    .selectFrom('autopilot')
                    .select(['id', 'triggers', 'name'])
                    .where('fk_project_id', '=', payload.projectId)
                    .where('is_active', '=', true)
                    .execute();

                logger.info(
                    `[AutopilotTriggerListener] Found ${rules.length} active autopilot rules for projectId=${payload.projectId}`,
                );

                for (const rule of rules) {
                    const triggers = Array.isArray(rule.triggers)
                        ? rule.triggers
                        : [];
                    logger.debug(
                        `[AutopilotTriggerListener] Evaluating rule "${rule.name}" (${rule.id}) with triggers: [${triggers.join(', ')}]`,
                    );

                    const matches = triggers.filter((trigger) =>
                        triggerTypes.has(trigger),
                    );
                    if (matches.length === 0) {
                        logger.debug(
                            `[AutopilotTriggerListener] Rule "${rule.name}" (${rule.id}) triggers did not match event trigger types. Skipped.`,
                        );
                        continue;
                    }

                    logger.info(
                        `[AutopilotTriggerListener] MATCH! Rule "${rule.name}" (${rule.id}) triggered by task trigger types: [${matches.join(', ')}]`,
                    );

                    const isRecursiveTrigger =
                        payload.actorId === 'system:autopilot';
                    const depth = payload.depth || 0;

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
                                isRecursiveTrigger,
                                depth,
                            },
                        },
                    });
                }
            }

            if (outboxEntries.length > 0) {
                logger.info(
                    `[AutopilotTriggerListener] Appending ${outboxEntries.length} pipeline.trigger events to the outbox`,
                );
                await appendEventsToOutbox(trx, outboxEntries);
            } else {
                logger.debug(
                    `[AutopilotTriggerListener] No matching autopilot rules triggered for this batch`,
                );
            }
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
