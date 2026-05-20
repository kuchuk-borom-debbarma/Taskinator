import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskFieldChangedSchema } from '../types.js';
import { getTaskFieldValues } from './helpers.js';

export const TaskFieldChangedCondition: ConditionDefinition<
    typeof taskFieldChangedSchema
> = {
    type: 'TaskFieldChanged',
    name: 'Task Field Changed',
    description: 'Triggers when a specific standard task field changes value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return prevValue !== currentValue;
    },
};
