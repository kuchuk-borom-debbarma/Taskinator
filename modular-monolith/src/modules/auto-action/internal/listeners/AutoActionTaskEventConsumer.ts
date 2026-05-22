import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { autoActionService } from '../../index.ts';

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
        await autoActionService.handleTaskEvents(events);
    }
}
