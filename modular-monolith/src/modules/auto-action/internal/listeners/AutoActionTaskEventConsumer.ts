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

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'auto-action-task-trigger-group',
            {
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskEvents.bind(this),
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskEvents.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskEvents(events: DomainEvent[]) {
        await autoActionService.handleTaskEvents(events);
    }
}
