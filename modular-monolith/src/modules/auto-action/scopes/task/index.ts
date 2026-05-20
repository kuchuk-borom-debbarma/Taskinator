import { conditionRegistry } from '../../conditionEngine.js';
import { contextResolverRegistry } from '../../contextEngine.js';
import { registerSetFields } from './actions/setFields.js';
import { taskConditions } from './conditions/index.js';
import { taskContextResolver } from './context.js';

export * from './actions/setFields.js';
export * from './conditions/index.js';
export * from './context.js';
export * from './types.js';

/**
 * Initializes the Task scope by registering actions, conditions, and context resolver.
 */
export function initTaskScope(): void {
    registerSetFields();

    // Register all task-scoped condition definitions
    taskConditions.forEach((c) => conditionRegistry.registerCondition(c));

    // Register task context resolver
    contextResolverRegistry.registerResolver(taskContextResolver);
}
