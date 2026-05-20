import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskFieldChangedToSchema } from '../types.js';
import { getTaskFieldValues } from './helpers.js';

export const TaskFieldChangedToCondition: ConditionDefinition<
    typeof taskFieldChangedToSchema
> = {
    type: 'TaskFieldChangedTo',
    name: 'Task Field Changed To',
    description:
        'Triggers when a specific standard task field changes to a targeted value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedToSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return currentValue === node.to && prevValue !== node.to;
    },
};
