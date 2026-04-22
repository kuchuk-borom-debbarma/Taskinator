import { yoga } from './graphql';
import { startConsumers } from './kafka/registry.ts';
import { logger } from './logger';
import { authService } from './modules/auth/index.ts';
import { externalNotificationService } from './modules/external-notification/index.ts';
import { internalNotificationService } from './modules/internal-notification/index.ts';
import { projectService } from './modules/project';
import { teamService } from './modules/team';
import { stopRedis } from './redis/index';
import { startRedisBridge } from './redis/RealtimeRedisBridge';
import eventBus from './utils/EventBus';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from './utils/event-bus/OutboxRelay';

let isRunning = false;

/**
 * The Unified Bootstrap for Taskinator.
 * Used by both the production entry point and E2E tests to ensure 100% parity.
 */
export async function bootstrap(
    options: { port?: number; silent?: boolean } = {},
) {
    if (isRunning) return (req: Request) => yoga(req);

    if (!options.silent) logger.info('[App] Starting Taskinator System...');

    // 1. Infrastructure
    await eventBus.init();

    // 2. Domain Services & Consumers
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

    isRunning = true;
    if (!options.silent) logger.info('[App] System is READY');

    // Return the yoga handler for Bun.serve
    return (req: Request) => yoga(req);
}

/**
 * Cleanly shuts down all background processes and connections.
 */
export async function shutdown() {
    if (!isRunning) return;

    logger.info('[App] Shutting down...');
    stopOutboxRelay();
    await eventBus.destroy();
    await stopRedis();

    isRunning = false;
    logger.info('[App] Shutdown complete');
}
