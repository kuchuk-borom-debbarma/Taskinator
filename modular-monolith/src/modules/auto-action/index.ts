import { logger } from '../../logger/index.ts';
import { initTaskScope } from './scopes/task/index.js';

export * from './actionEngine.js';
export * from './conditionEngine.js';
export * from './contextEngine.js';
export * from './scopes/task/index.js';
export * from './types.js';

/**
 * Initializes the auto-action module by registering all starter scopes, actions and conditions.
 */
export async function init(): Promise<void> {
    logger.info('[AutoAction] Initializing automation engine module...');

    // Initialize the TASK scope registries
    initTaskScope();

    logger.info(
        '[AutoAction] Automation engine successfully initialized and registered.',
    );
}
