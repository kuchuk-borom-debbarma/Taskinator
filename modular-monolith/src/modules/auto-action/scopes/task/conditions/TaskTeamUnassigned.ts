import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskTeamUnassignedSchema } from '../types.js';

export const TaskTeamUnassignedCondition: ConditionDefinition<
    typeof taskTeamUnassignedSchema
> = {
    type: 'TaskTeamUnassigned',
    name: 'Task Team Unassigned',
    description: 'Triggers when a team is unassigned from the task.',
    isSync: true,
    scope: EntityScope.TASK,
    schema: taskTeamUnassignedSchema,
    evaluate(ctx: TaskContext) {
        return (
            ctx.prev_team_id !== null &&
            ctx.prev_team_id !== undefined &&
            (ctx.current_team_id === null || ctx.current_team_id === undefined)
        );
    },
};
