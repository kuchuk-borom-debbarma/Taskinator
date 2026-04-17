import type { Team, Member } from '../types';

export interface TeamAPI {
  getTeams(projectId: string): Promise<Team[]>;
  getTeamMembers(projectId: string, teamId: string): Promise<Member[]>;
}
