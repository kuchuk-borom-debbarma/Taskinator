import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus';
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
                    const eventType = payload.type;
                    if (!eventType) {
                        logger.warn(
                            `[AutopilotSubscriber] Received event without type on topic ${topic}`,
                        );
                        return;
                    }

                    // For now, traceId might not be in payload. We'll generate one if missing.
                    const traceId =
                        payload.traceId ||
                        `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    try {
                        await this.engine.processEvent({
                            type: eventType,
                            payload,
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
