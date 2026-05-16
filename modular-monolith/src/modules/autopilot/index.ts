import { db } from '../../database/index.ts';
import { AutopilotQueryService } from './internal/AutopilotQueryService.ts';

export const autopilotQueryService = new AutopilotQueryService(db);

export async function init() {
    // Empty stub: legacy engine initialization removed.
}
