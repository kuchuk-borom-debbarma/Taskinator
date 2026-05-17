import { db } from '../../database/index.ts';
import { logger } from '../../logger/index.ts';
import { ActionExecutor } from './action-engine/ActionExecutor.ts';
import { ActionRepository } from './action-engine/ActionRepository.ts';
import { AsyncResolverRegistry } from './action-engine/AsyncResolverRegistry.ts';
import { registerDefaultResolvers } from './action-engine/defaultResolvers.ts';
import { ConditionRepository } from './condition-engine/ConditionRepository.ts';
import { ContextBuilder } from './condition-engine/ContextBuilder.ts';
import { AutopilotQueryService } from './internal/AutopilotQueryService.ts';
import { AutopilotTriggerListener } from './orchestrator/AutopilotTriggerListener.ts';
import { PipelineEventListener } from './orchestrator/PipelineEventListener.ts';
import { PipelineOrchestrator } from './orchestrator/PipelineOrchestrator.ts';
import { smartAggregator } from './orchestrator/SmartAggregator.ts';

export const autopilotQueryService = new AutopilotQueryService(db);
export const conditionRepository = new ConditionRepository();
export const actionRepository = new ActionRepository();

// Rebuilding dynamic engine architecture
export const resolverRegistry = new AsyncResolverRegistry();
registerDefaultResolvers(resolverRegistry);

export const actionExecutor = new ActionExecutor();
export const contextBuilder = new ContextBuilder();

export const pipelineOrchestrator = new PipelineOrchestrator(
    autopilotQueryService,
    conditionRepository,
    actionRepository,
    actionExecutor,
    contextBuilder,
    resolverRegistry,
);

export const pipelineEventListener = new PipelineEventListener(
    pipelineOrchestrator,
    smartAggregator,
);
export const autopilotTriggerListener = new AutopilotTriggerListener();

export async function init() {
    logger.info('[Autopilot] Initializing Autopilot engine modules...');
    await autopilotTriggerListener.init();
    await pipelineEventListener.init();
    logger.info('[Autopilot] Autopilot engine initialized and listening');
}
