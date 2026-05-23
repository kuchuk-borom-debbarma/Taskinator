import { logger } from '../../logger/index.js';
import { AutoActionServiceImpl } from './internal/service/AutoActionServiceImpl.js';

export * from './AutoActionService.js';
export * from './types.js';

export const autoActionService = new AutoActionServiceImpl();

/**
 * Initializes the auto-action module.
 */
export async function init(): Promise<void> {
    logger.info('[AutoAction] Initializing automation module...');

    logger.info('[AutoAction] Automation module successfully initialized.');
}
