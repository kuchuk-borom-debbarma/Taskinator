import { autoActionRegistry } from './registry.js';
import type { TriggerDefinition } from './types.js';
import { EntityScope } from './types.js';

export const taskCreatedTrigger: TriggerDefinition = {
    id: 'task.created',
    name: 'Task Created',
    scope: EntityScope.TASK,
};

export const taskUpdatedTrigger: TriggerDefinition = {
    id: 'task.updated',
    name: 'Task Updated',
    scope: EntityScope.TASK,
};

/**
 * Registers all starter triggers into the global registry.
 */
export function registerTriggers(): void {
    autoActionRegistry.registerTrigger(taskCreatedTrigger);
    autoActionRegistry.registerTrigger(taskUpdatedTrigger);
}
