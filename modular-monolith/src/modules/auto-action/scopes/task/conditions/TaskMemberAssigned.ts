import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskMemberAssignedSchema } from '../types.js';

export const TaskMemberAssignedCondition: ConditionDefinition<
    typeof taskMemberAssignedSchema
> = {
    type: 'TaskMemberAssigned',
    name: 'Task Member Assigned',
    description: 'Triggers when a member is assigned to the task.',
    isSync: true,
    scope: EntityScope.TASK,
    schema: taskMemberAssignedSchema,
    evaluate(ctx: TaskContext, node) {
        if (node.memberId !== undefined) {
            return (
                ctx.current_member_id === node.memberId &&
                ctx.prev_member_id !== node.memberId
            );
        }
        return (
            ctx.current_member_id !== null &&
            ctx.current_member_id !== undefined &&
            ctx.prev_member_id === null
        );
    },
};
