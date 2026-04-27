import type { PageInfo, PaginationArgs, Team, TeamMember } from '../types';

export interface TeamAPI {
  getTeams(projectId: string, pagination?: PaginationArgs): Promise<{ teams: Team[], pageInfo: PageInfo }>;
  getTeam(teamId: string): Promise<Team | null>;
  getTeamMembers(projectId: string, teamId: string, pagination?: PaginationArgs): Promise<{ members: TeamMember[], pageInfo: PageInfo }>;
  createTeam(projectId: string, name: string): Promise<{ success: boolean; team?: Team }>;
  deleteTeams(projectId: string, teamIds: string[]): Promise<{ success: boolean; deletedCount: number }>;
  addTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }>;
  removeTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }>;
}
