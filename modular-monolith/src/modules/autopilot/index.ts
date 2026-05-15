import { db } from '../../database/index.ts';
import { taskService } from '../task/index.ts';
import { createActionHandlers } from './internal/ActionHandlers';
import { ActionRunner } from './internal/ActionRunner';
import { AuditService } from './internal/AuditService';
import { AutopilotDispatcher } from './internal/AutopilotDispatcher';
import { AutopilotEngine } from './internal/AutopilotEngine';
import { AutopilotQueryService } from './internal/AutopilotQueryService';
import { ConditionEvaluator } from './internal/ConditionEvaluator';
import { ContextService } from './internal/ContextService';
import { ProjectContextResolver } from './internal/ProjectContextResolver';
import { TaskContextResolver } from './internal/TaskContextResolver';

export const auditService = new AuditService(db);
export const autopilotQueryService = new AutopilotQueryService(db);
export const contextService = new ContextService();
export const conditionEvaluator = new ConditionEvaluator();
export const actionHandlers = createActionHandlers(taskService);
export const actionRunner = new ActionRunner(db, actionHandlers, auditService);
export const autopilotEngine = new AutopilotEngine(
    db,
    contextService,
    conditionEvaluator,
    actionRunner,
    auditService,
);
export const autopilotDispatcher = new AutopilotDispatcher(autopilotEngine);

// Register Resolvers
contextService.registerResolver('task', new TaskContextResolver());
contextService.registerResolver('project', new ProjectContextResolver());

export async function init() {
    await autopilotDispatcher.init();
    // One-off cleanup on startup (30 days retention)
    await auditService
        .cleanupOldLogs(30)
        .catch((err) =>
            logger.error('[Autopilot] Retention cleanup failed:', err),
        );
}

export { ActionRunner, AutopilotDispatcher, AutopilotEngine, ContextService };
