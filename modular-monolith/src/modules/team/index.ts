import { TeamServiceImpl } from './internal/TeamServiceImpl.ts';
import type { Team, TeamMember } from './TeamService.ts';

export const teamService = new TeamServiceImpl();
export type { Team, TeamMember };
