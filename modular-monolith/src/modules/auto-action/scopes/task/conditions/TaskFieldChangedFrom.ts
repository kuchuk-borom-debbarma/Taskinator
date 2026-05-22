import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskFieldChangedFromSchema } from '../types.js';
import { getTaskFieldValues } from './helpers.js';

export const TaskFieldChangedFromCondition: ConditionDefinition<
    typeof taskFieldChangedFromSchema
> = {
    type: 'TaskFieldChangedFrom',
    name: 'Task Field Changed From',
    description:
        'Triggers when a specific standard task field changes away from a targeted value.',
    isSync: true,
    scope: EntityScope.TASK,
    schema: taskFieldChangedFromSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return prevValue === node.from && currentValue !== node.from;
    },
};
