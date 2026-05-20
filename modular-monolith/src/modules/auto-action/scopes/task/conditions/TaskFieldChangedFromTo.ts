import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskFieldChangedFromToSchema } from '../types.js';
import { getTaskFieldValues } from './helpers.js';

export const TaskFieldChangedFromToCondition: ConditionDefinition<
    typeof taskFieldChangedFromToSchema
> = {
    type: 'TaskFieldChangedFromTo',
    name: 'Task Field Changed From To',
    description:
        'Triggers when a specific standard task field changes from a targeted value to another targeted value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedFromToSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return prevValue === node.from && currentValue === node.to;
    },
};
