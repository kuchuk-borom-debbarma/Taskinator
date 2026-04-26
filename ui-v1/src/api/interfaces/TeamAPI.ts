import type { Team, TeamMember } from '../types';

export interface TeamAPI {
  getTeams(projectId: string, first?: number, after?: string): Promise<{ teams: Team[], hasNextPage: boolean, endCursor: string | null }>;
  getTeamMembers(projectId: string, teamId: string, first?: number, after?: string): Promise<{ members: TeamMember[], hasNextPage: boolean, endCursor: string | null }>;
  createTeam(projectId: string, name: string): Promise<{ success: boolean; team?: Team }>;
  deleteTeams(projectId: string, teamIds: string[]): Promise<{ success: boolean; deletedCount: number }>;
  addTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }>;
  removeTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }>;
}
