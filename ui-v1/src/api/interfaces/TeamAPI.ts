import type { Team, TeamMember } from '../types';

export interface TeamAPI {
  getTeams(projectId: string, params?: { first?: number, after?: string, last?: number, before?: string }): Promise<{ teams: Team[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }>;
  getTeam(teamId: string): Promise<Team | null>;
  getTeamMembers(projectId: string, teamId: string, params?: { first?: number, after?: string, last?: number, before?: string }): Promise<{ members: TeamMember[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }>;
  createTeam(projectId: string, name: string): Promise<{ success: boolean; team?: Team }>;
  deleteTeams(projectId: string, teamIds: string[]): Promise<{ success: boolean; deletedCount: number }>;
  addTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }>;
  removeTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }>;
}
