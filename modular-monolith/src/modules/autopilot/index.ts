import { db } from '../../database/index.ts';
import { ActionRepository } from './action-engine/ActionRepository.ts';
import { ConditionRepository } from './condition-engine/ConditionRepository.ts';
import { AutopilotQueryService } from './internal/AutopilotQueryService.ts';

export const autopilotQueryService = new AutopilotQueryService(db);
export const conditionRepository = new ConditionRepository();
export const actionRepository = new ActionRepository();

export async function init() {
    // Empty stub: legacy engine initialization removed.
}
