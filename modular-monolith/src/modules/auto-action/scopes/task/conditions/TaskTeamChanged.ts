import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskTeamChangedSchema } from '../types.js';

export const TaskTeamChangedCondition: ConditionDefinition<
    typeof taskTeamChangedSchema
> = {
    type: 'TaskTeamChanged',
    name: 'Task Team Changed',
    description: 'Triggers when the team assigned to the task changes.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskTeamChangedSchema,
    evaluate(ctx: TaskContext) {
        return ctx.prev_team_id !== ctx.current_team_id;
    },
};
