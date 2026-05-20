import { logger } from '../../logger/index.ts';
import { registerSetFields } from './actions/setFields.js';
import { registerTriggers } from './triggers.js';

export * from './actions/setFields.js';
export * from './registry.js';
export * from './triggers.js';
export * from './types.js';

/**
 * Initializes the auto-action module by registering all starter triggers and actions.
 */
export async function init(): Promise<void> {
    logger.info('[AutoAction] Initializing automation engine module...');

    // Register triggers
    registerTriggers();

    // Register actions
    registerSetFields();

    logger.info(
        '[AutoAction] Automation engine successfully initialized and registered.',
    );
}
