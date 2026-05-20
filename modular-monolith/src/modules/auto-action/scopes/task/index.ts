import { conditionRegistry } from '../../conditionEngine.js';
import { registerSetFields } from './actions/setFields.js';
import { taskConditions } from './conditions/index.js';

export * from './actions/setFields.js';
export * from './conditions/index.js';
export * from './types.js';

/**
 * Initializes the Task scope by registering actions and conditions.
 */
export function initTaskScope(): void {
    registerSetFields();

    // Register all task-scoped condition definitions
    taskConditions.forEach((c) => conditionRegistry.registerCondition(c));
}
