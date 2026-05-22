import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskTeamAssignedSchema } from '../types.js';

export const TaskTeamAssignedCondition: ConditionDefinition<
    typeof taskTeamAssignedSchema
> = {
    type: 'TaskTeamAssigned',
    name: 'Task Team Assigned',
    description: 'Triggers when a team is assigned to the task.',
    isSync: true,
    scope: EntityScope.TASK,
    schema: taskTeamAssignedSchema,
    evaluate(ctx: TaskContext, node) {
        if (node.teamId !== undefined) {
            return (
                ctx.current_team_id === node.teamId &&
                ctx.prev_team_id !== node.teamId
            );
        }
        return (
            ctx.current_team_id !== null &&
            ctx.current_team_id !== undefined &&
            ctx.prev_team_id === null
        );
    },
};
