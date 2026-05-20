import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskMemberUnassignedSchema } from '../types.js';

export const TaskMemberUnassignedCondition: ConditionDefinition<
    typeof taskMemberUnassignedSchema
> = {
    type: 'TaskMemberUnassigned',
    name: 'Task Member Unassigned',
    description: 'Triggers when a member is unassigned from the task.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskMemberUnassignedSchema,
    evaluate(ctx: TaskContext) {
        return (
            ctx.prev_member_id !== null &&
            ctx.prev_member_id !== undefined &&
            (ctx.current_member_id === null ||
                ctx.current_member_id === undefined)
        );
    },
};
