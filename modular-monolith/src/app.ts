import { yoga } from './infra/graphql';
import { startConsumers } from './infra/kafka/registry.ts';
import { logger } from './infra/logger';
import { stopRedis } from './infra/redis/index';
import eventBus from './infra/utils/EventBus';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from './infra/utils/event-bus/OutboxRelay';
import { authService } from './modules/auth/index.ts';
import { projectService } from './modules/project';
import { teamService } from './modules/team';

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
        startConsumers(),
    ]);

    // 3. Background Processing
    startOutboxRelay();

    isRunning = true;
    if (!options.silent) logger.info('[App] System is READY');

    // Return the handler for Bun.serve
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
