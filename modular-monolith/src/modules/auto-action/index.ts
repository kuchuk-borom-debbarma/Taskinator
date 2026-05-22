import { logger } from '../../logger/index.js';
import { syncActionRegistry } from '../../utils/SyncActionRegistry.js';
import { AutoActionServiceImpl } from './internal/service/AutoActionServiceImpl.js';
import { initTaskScope } from './scopes/task/index.js';

export * from './AutoActionService.js';
export * from './types.js';

export const autoActionService = new AutoActionServiceImpl();

/**
 * Initializes the auto-action module by registering all starter scopes, actions and conditions.
 */
export async function init(): Promise<void> {
    logger.info('[AutoAction] Initializing automation engine module...');

    // Initialize the TASK scope registries
    initTaskScope();

    // Register sync event handlers for the request lifecycle (ORCH-01)
    syncActionRegistry.registerHandler('task.created', (event) =>
        autoActionService.handleSyncTaskEvents(event),
    );
    syncActionRegistry.registerHandler('task.updated', (event) =>
        autoActionService.handleSyncTaskEvents(event),
    );

    logger.info(
        '[AutoAction] Automation engine successfully initialized and registered.',
    );
}
