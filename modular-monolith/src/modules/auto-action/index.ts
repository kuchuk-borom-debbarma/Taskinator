import { logger } from '../../logger/index.ts';
import { registerSendInternalNotification } from './actions/sendInternalNotification.js';
import { registerSetTaskStatus } from './actions/setTaskStatus.js';
import { registerTriggers } from './triggers.js';

export * from './actions/sendInternalNotification.js';
export * from './actions/setTaskStatus.js';
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
    registerSetTaskStatus();
    registerSendInternalNotification();

    logger.info(
        '[AutoAction] Automation engine successfully initialized and registered.',
    );
}
