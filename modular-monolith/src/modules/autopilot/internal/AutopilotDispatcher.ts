import { context, trace } from '@opentelemetry/api';
import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import type { AutopilotEngine } from './AutopilotEngine';

export class AutopilotDispatcher {
    constructor(private engine: AutopilotEngine) {}

    async init() {
        logger.info(
            '[AutopilotDispatcher] Initializing async event subscriptions...',
        );

        const topics = ['task-events', 'project-events', 'team-events'];

        for (const topic of topics) {
            await eventBus.subscribe(
                topic,
                'autopilot-engine',
                {
                    '*': async (events: any[]) => {
                        for (const event of events) {
                            const spanContext = trace.getSpanContext(
                                context.active(),
                            );
                            const traceId =
                                spanContext?.traceId ||
                                event.traceId ||
                                event.data?.traceId ||
                                `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                            const eventType = event.type;
                            const data = event.data || event;

                            if (!eventType) {
                                logger.warn(
                                    `[AutopilotDispatcher] Received event without type on topic ${topic}`,
                                );
                                continue;
                            }

                            try {
                                await this.engine.processEvent({
                                    type: eventType,
                                    payload: data,
                                    traceId,
                                });
                            } catch (err) {
                                logger.error(
                                    `[AutopilotDispatcher] Execution failed for event ${eventType}:`,
                                    err,
                                );
                            }
                        }
                    },
                },
                { batch: true },
            );
        }
    }
}
