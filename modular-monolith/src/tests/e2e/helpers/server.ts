import { createServer } from 'node:http';
import { yoga } from '../../../graphql/index.ts';
import { startConsumers } from '../../../kafka/registry.ts';
import { authService } from '../../../modules/auth/index.ts';
import { externalNotificationService } from '../../../modules/external-notification/index.ts';
import { internalNotificationService } from '../../../modules/internal-notification/index.ts';
import { projectService } from '../../../modules/project/index.ts';
import { teamService } from '../../../modules/team/index.ts';
import { startRedisBridge } from '../../../redis/RealtimeRedisBridge.ts';
import eventBus from '../../../utils/EventBus.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../../../utils/event-bus/OutboxRelay.ts';

/**
 * A shared HTTP server instance for E2E tests.
 */
export const testServer = createServer(yoga);

/**
 * Automatically bootstraps the entire infrastructure for E2E tests.
 * This ensures the Outbox Relay, Kafka Consumers, and Services are running
 * exactly as they do in production.
 */
export async function bootstrapE2E() {
    // 1. Core Bus
    await eventBus.init();

    // 2. All Services and Consumers
    await Promise.all([
        projectService.init(),
        teamService.init(),
        authService.init(),
        externalNotificationService.init(),
        internalNotificationService.init(),
        startConsumers(),
        startRedisBridge(),
    ]);

    // 3. Background Processing
    startOutboxRelay();
}

/**
 * Cleanly shuts down the infrastructure after tests.
 */
export async function teardownE2E() {
    stopOutboxRelay();
    await eventBus.destroy();
}
