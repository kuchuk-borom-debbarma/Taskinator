import { startConsumers } from './infra/events/consumers/registry.ts';
import { yoga } from './infra/graphql';
import { infra } from './infra/index.ts';
import { logger } from './infra/logger';
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
    await infra.init();

    // 2. Domain Services & Consumers
    await Promise.all([
        projectService.init(),
        teamService.init(),
        authService.init(),
        startConsumers(),
    ]);

    // 3. Background Processing
    infra.eventRelay.start();

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
    await infra.destroy();

    isRunning = false;
    logger.info('[App] Shutdown complete');
}
