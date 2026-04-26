import type { TeamAPI } from '../../interfaces/TeamAPI';
import type { Team, TeamMember } from '../../types';
import { AuthenticationError } from '../../errors';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

const gql = String.raw;

export class GraphQLTeamAPI implements TeamAPI {
  private token: string | null;
  private onUnauthorized?: () => void;

  constructor(token: string | null, options?: { onUnauthorized?: () => void }) {
    this.token = token;
    this.onUnauthorized = options?.onUnauthorized;
  }

  private async query<T>(queryStr: string, variables: any = {}): Promise<T> {
    const operationMatch = queryStr.match(/(query|mutation)\s+(\w+)/);
    const opName = operationMatch?.[2] || 'Anonymous';
    const start = performance.now();

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ query: queryStr, variables, operationName: opName }),
    });

    const result = await response.json();
    const duration = (performance.now() - start).toFixed(0);

    if (result.errors) {
      console.groupCollapsed(
        `%c[GQL ERROR] %c${opName} %c(${duration}ms)`,
        'color: #ef4444; font-size: 10px;',
        'color: #ef4444; font-weight: bold;',
        'color: #94a3b8; font-weight: normal;'
      );
      console.error('Errors:', result.errors);
      console.log('Variables:', variables);
      console.groupEnd();

      const firstError = result.errors[0];
      if (firstError.extensions?.code === 'UNAUTHENTICATED') {
        this.onUnauthorized?.();
        throw new AuthenticationError();
      }
      throw new Error(firstError.message);
    }

    return result.data as T;
  }

  async getTeams(
    projectId: string, 
    params: { first?: number, after?: string, last?: number, before?: string } = {}
  ): Promise<{ teams: Team[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }> {
    const { first, after, last, before } = params;
    const data = await this.query<any>(gql`
      query GetProjectTeams($projectId: ID!, $first: Int, $after: String, $last: Int, $before: String) {
        project(id: $projectId) {
          teams(first: $first, after: $after, last: $last, before: $before) {
            edges {
              node {
                id
                name
                createdBy { id username }
                createdAt
                updatedAt
                version
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      }
    `, { projectId, first, after, last, before });
 
    const conn = data.project?.teams;
    if (!conn) return { teams: [], hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null };
 
    return {
      teams: conn.edges.map((e: any) => e.node),
      hasNextPage: conn.pageInfo.hasNextPage || false,
      hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
      endCursor: conn.pageInfo.endCursor || null,
      startCursor: conn.pageInfo.startCursor || null,
    };
  }

  async getTeam(teamId: string): Promise<Team | null> {
    const data = await this.query<any>(gql`
      query GetTeam($teamId: ID!) {
        team(id: $teamId) {
          id
          name
          createdAt
          updatedAt
          version
          createdBy { id username }
          project { id name }
        }
      }
    `, { teamId });
    return data.team || null;
  }

  async getTeamMembers(
    projectId: string, 
    teamId: string, 
    params: { first?: number, after?: string, last?: number, before?: string } = {}
  ): Promise<{ members: TeamMember[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }> {
    const { first, after, last, before } = params;
    const data = await this.query<any>(gql`
      query GetTeamMembers($projectId: ID!, $teamId: ID!, $first: Int, $after: String, $last: Int, $before: String) {
        teamMembers(projectId: $projectId, teamId: $teamId, first: $first, after: $after, last: $last, before: $before) {
          edges {
            node {
              id
              user { id username }
              createdAt
              version
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `, { projectId, teamId, first, after, last, before });

    return {
      members: data.teamMembers.edges.map((e: any) => e.node),
      hasNextPage: data.teamMembers.pageInfo.hasNextPage || false,
      hasPreviousPage: data.teamMembers.pageInfo.hasPreviousPage || false,
      endCursor: data.teamMembers.pageInfo.endCursor || null,
      startCursor: data.teamMembers.pageInfo.startCursor || null,
    };
  }

  async createTeam(projectId: string, name: string): Promise<{ success: boolean; team?: Team }> {
    const data = await this.query<any>(gql`
      mutation CreateTeam($projectId: ID!, $name: String!) {
        createTeam(projectId: $projectId, name: $name) {
          success
          team {
            id
            name
            createdBy { id username }
            createdAt
            version
          }
        }
      }
    `, { projectId, name });
    return data.createTeam;
  }

  async deleteTeams(projectId: string, teamIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const data = await this.query<any>(gql`
      mutation DeleteTeams($projectId: ID!, $teamIds: [ID!]!) {
        deleteTeams(projectId: $projectId, teamIds: $teamIds) {
          success
          deletedCount
        }
      }
    `, { projectId, teamIds });
    return data.deleteTeams;
  }

  async addTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }> {
    const data = await this.query<any>(gql`
      mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {
        addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
          success
        }
      }
    `, { projectId, teamId, userIds });
    return data.addTeamMembers;
  }

  async removeTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }> {
    const data = await this.query<any>(gql`
      mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {
        removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
          success
        }
      }
    `, { projectId, teamId, userIds });
    return data.removeTeamMembers;
  }
}
