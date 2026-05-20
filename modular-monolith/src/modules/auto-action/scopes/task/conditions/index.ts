import type { ConditionDefinition } from '../../../types.js';
import { TaskFieldChangedCondition } from './TaskFieldChanged.js';
import { TaskFieldChangedFromCondition } from './TaskFieldChangedFrom.js';
import { TaskFieldChangedFromToCondition } from './TaskFieldChangedFromTo.js';
import { TaskFieldChangedToCondition } from './TaskFieldChangedTo.js';
import { TaskMemberAssignedCondition } from './TaskMemberAssigned.js';
import { TaskMemberChangedCondition } from './TaskMemberChanged.js';
import { TaskMemberUnassignedCondition } from './TaskMemberUnassigned.js';
import { TaskTeamAssignedCondition } from './TaskTeamAssigned.js';
import { TaskTeamChangedCondition } from './TaskTeamChanged.js';
import { TaskTeamUnassignedCondition } from './TaskTeamUnassigned.js';

export { getTaskFieldValues } from './helpers.js';
export { TaskFieldChangedCondition } from './TaskFieldChanged.js';
export { TaskFieldChangedFromCondition } from './TaskFieldChangedFrom.js';
export { TaskFieldChangedFromToCondition } from './TaskFieldChangedFromTo.js';
export { TaskFieldChangedToCondition } from './TaskFieldChangedTo.js';
export { TaskMemberAssignedCondition } from './TaskMemberAssigned.js';
export { TaskMemberChangedCondition } from './TaskMemberChanged.js';
export { TaskMemberUnassignedCondition } from './TaskMemberUnassigned.js';
export { TaskTeamAssignedCondition } from './TaskTeamAssigned.js';
export { TaskTeamChangedCondition } from './TaskTeamChanged.js';
export { TaskTeamUnassignedCondition } from './TaskTeamUnassigned.js';

export const taskConditions: ConditionDefinition<any>[] = [
    TaskFieldChangedCondition,
    TaskFieldChangedToCondition,
    TaskFieldChangedFromCondition,
    TaskFieldChangedFromToCondition,
    TaskTeamChangedCondition,
    TaskTeamAssignedCondition,
    TaskTeamUnassignedCondition,
    TaskMemberChangedCondition,
    TaskMemberAssignedCondition,
    TaskMemberUnassignedCondition,
];
