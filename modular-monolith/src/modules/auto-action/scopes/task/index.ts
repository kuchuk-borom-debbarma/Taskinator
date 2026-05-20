import { autoActionRegistry } from '../../registry.js';
import { registerSetFields } from './actions/setFields.js';
import { taskConditions } from './conditions.js';
import { registerTriggers } from './triggers.js';

export * from './actions/setFields.js';
export * from './conditions.js';
export * from './triggers.js';
export * from './types.js';

/**
 * Initializes the Task scope by registering triggers, actions, and conditions.
 */
export function initTaskScope(): void {
    registerTriggers();
    registerSetFields();

    // Register all task-scoped condition definitions
    taskConditions.forEach((c) => autoActionRegistry.registerCondition(c));
}
