import { db } from '../../database/index.ts';
import { AutopilotEngine } from './internal/AutopilotEngine';
import { AutopilotSubscriber } from './internal/AutopilotSubscriber';
import { ConditionEvaluator } from './internal/ConditionEvaluator';
import { ContextService } from './internal/ContextService';
import { ProjectContextResolver } from './internal/ProjectContextResolver';
import { TaskContextResolver } from './internal/TaskContextResolver';

// Services
export const contextService = new ContextService();
export const conditionEvaluator = new ConditionEvaluator();
export const autopilotEngine = new AutopilotEngine(
    db,
    contextService,
    conditionEvaluator,
);
export const autopilotSubscriber = new AutopilotSubscriber(autopilotEngine);

// Register Resolvers
contextService.registerResolver('task', new TaskContextResolver());
contextService.registerResolver('project', new ProjectContextResolver());

export async function init() {
    await autopilotSubscriber.subscribe();
}

export { AutopilotEngine, AutopilotSubscriber, ContextService };
