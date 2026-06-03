import { traceService } from '../../infra/tracing/index.ts';
import { TeamServiceImpl } from './internal/TeamServiceImpl.ts';
import type { Team, TeamMember } from './TeamService.ts';

export const teamService = traceService('TeamService', new TeamServiceImpl());
export type { Team, TeamMember };
