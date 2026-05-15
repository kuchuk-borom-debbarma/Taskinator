import { db } from '../../database/index.ts';
import { taskService } from '../task/index.ts';
import { createActionHandlers } from './internal/ActionHandlers';
import { ActionRunner } from './internal/ActionRunner';
import { AutopilotDispatcher } from './internal/AutopilotDispatcher';
import { AutopilotEngine } from './internal/AutopilotEngine';
import { ConditionEvaluator } from './internal/ConditionEvaluator';
import { ContextService } from './internal/ContextService';
import { ProjectContextResolver } from './internal/ProjectContextResolver';
import { TaskContextResolver } from './internal/TaskContextResolver';

export const contextService = new ContextService();
export const conditionEvaluator = new ConditionEvaluator();
export const actionHandlers = createActionHandlers(taskService);
export const actionRunner = new ActionRunner(db, actionHandlers);
export const autopilotEngine = new AutopilotEngine(
    db,
    contextService,
    conditionEvaluator,
    actionRunner,
);
export const autopilotDispatcher = new AutopilotDispatcher(autopilotEngine);

// Register Resolvers
contextService.registerResolver('task', new TaskContextResolver());
contextService.registerResolver('project', new ProjectContextResolver());

export async function init() {
    await autopilotDispatcher.init();
}

export { ActionRunner, AutopilotDispatcher, AutopilotEngine, ContextService };
