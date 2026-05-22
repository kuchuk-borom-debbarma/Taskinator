import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskMemberChangedSchema } from '../types.js';

export const TaskMemberChangedCondition: ConditionDefinition<
    typeof taskMemberChangedSchema
> = {
    type: 'TaskMemberChanged',
    name: 'Task Member Changed',
    description: 'Triggers when the member assigned to the task changes.',
    isSync: true,
    scope: EntityScope.TASK,
    schema: taskMemberChangedSchema,
    evaluate(ctx: TaskContext) {
        return ctx.prev_member_id !== ctx.current_member_id;
    },
};
