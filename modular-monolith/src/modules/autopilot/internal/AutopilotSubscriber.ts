import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import type { AutopilotEngine } from './AutopilotEngine';

export class AutopilotSubscriber {
    constructor(private engine: AutopilotEngine) {}

    async subscribe() {
        logger.info(
            '[AutopilotSubscriber] Initializing domain event subscriptions...',
        );

        const topics = ['task-events', 'project-events'];

        for (const topic of topics) {
            await eventBus.subscribe(topic, 'autopilot-engine', {
                '*': async (payload: any) => {
                    // Try to find eventType in payload or payload.data
                    const eventType = payload.type || payload.data?.type;

                    if (!eventType) {
                        logger.warn(
                            `[AutopilotSubscriber] Received event without type on topic ${topic}. Payload keys: ${Object.keys(payload)}`,
                        );
                        return;
                    }

                    // Extract actual data payload
                    const data = payload.data || payload;

                    // For now, traceId might not be in payload. We'll generate one if missing.
                    const traceId =
                        payload.traceId ||
                        `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    try {
                        await this.engine.processEvent({
                            type: eventType,
                            payload: data,
                            traceId,
                        });
                    } catch (err) {
                        logger.error(
                            `[AutopilotSubscriber] Error processing event ${eventType}:`,
                            err,
                        );
                    }
                },
            });
        }
    }
}
