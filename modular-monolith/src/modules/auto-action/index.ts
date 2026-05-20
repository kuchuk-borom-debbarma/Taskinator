import { logger } from '../../logger/index.ts';
import { initTaskScope } from './scopes/task/index.js';

export * from './evaluator.js';
export * from './registry.js';
export * from './scopes/task/index.js';
export * from './template.js';
export * from './types.js';

/**
 * Initializes the auto-action module by registering all starter scopes, triggers and actions.
 */
export async function init(): Promise<void> {
    logger.info('[AutoAction] Initializing automation engine module...');

    // Initialize the TASK scope trigger and action registers
    initTaskScope();

    logger.info(
        '[AutoAction] Automation engine successfully initialized and registered.',
    );
}
