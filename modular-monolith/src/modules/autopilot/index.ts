import { db } from '../../database/index.ts';
import { taskService } from '../task/index.ts';
import { createActionHandlers } from './internal/ActionHandlers';
import { ActionRunner } from './internal/ActionRunner';
import { AutopilotEngine } from './internal/AutopilotEngine';
import { AutopilotSubscriber } from './internal/AutopilotSubscriber';
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
export const autopilotSubscriber = new AutopilotSubscriber(autopilotEngine);

// Register Resolvers
contextService.registerResolver('task', new TaskContextResolver());
contextService.registerResolver('project', new ProjectContextResolver());

export async function init() {
    await autopilotSubscriber.subscribe();
}

export { ActionRunner, AutopilotEngine, AutopilotSubscriber, ContextService };
