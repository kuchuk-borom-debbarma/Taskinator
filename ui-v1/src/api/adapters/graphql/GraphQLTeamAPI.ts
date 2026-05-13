import type { TeamAPI } from '../../interfaces/TeamAPI';
import type { PageInfo, PaginationArgs, Team, TeamMember } from '../../types';
import { AuthenticationError } from '../../errors';

import { CONFIG } from '../../../config';

const GRAPHQL_URL = CONFIG.API_URL;

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
    pagination?: PaginationArgs
  ): Promise<{ teams: Team[], pageInfo: PageInfo }> {
    const { first, after, last, before } = pagination || {};
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
    if (!conn) return { teams: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null } };
 
    return {
      teams: conn.edges.map((e: any) => e.node),
      pageInfo: {
        hasNextPage: conn.pageInfo.hasNextPage || false,
        hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
        endCursor: conn.pageInfo.endCursor || null,
        startCursor: conn.pageInfo.startCursor || null,
      }
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

  async getTeamDetail(teamId: string): Promise<{
    team: Team | null,
    members: { members: TeamMember[], pageInfo: PageInfo },
  }> {
    const data = await this.query<any>(gql`
      query GetTeamDetail($teamId: ID!) {
        team(id: $teamId) {
          id
          name
          createdAt
          updatedAt
          version
          createdBy { id username }
          project { id name }
          members(first: ${CONFIG.PAGINATION.MEMBERS_LIST}) {
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
      }
    `, { teamId });

    const team = data.team || null;
    const membersConn = team?.members;

    return {
      team,
      members: {
        members: membersConn?.edges.map((e: any) => e.node) || [],
        pageInfo: membersConn?.pageInfo || { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }
      }
    };
  }

  async getTeamMembers(
    projectId: string, 
    teamId: string, 
    pagination?: PaginationArgs
  ): Promise<{ members: TeamMember[], pageInfo: PageInfo }> {
    const { first, after, last, before } = pagination || {};
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
      pageInfo: {
        hasNextPage: data.teamMembers.pageInfo.hasNextPage || false,
        hasPreviousPage: data.teamMembers.pageInfo.hasPreviousPage || false,
        endCursor: data.teamMembers.pageInfo.endCursor || null,
        startCursor: data.teamMembers.pageInfo.startCursor || null,
      }
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

  async updateTeam(projectId: string, teamId: string, name: string, version: number): Promise<{ success: boolean; team?: Team }> {
    const data = await this.query<any>(gql`
      mutation UpdateTeam($projectId: ID!, $teamId: ID!, $name: String!, $version: Int!) {
        updateTeam(projectId: $projectId, teamId: $teamId, name: $name, version: $version) {
          success
          team {
            id
            name
            createdBy { id username }
            createdAt
            updatedAt
            version
            project { id name }
          }
        }
      }
    `, { projectId, teamId, name, version });
    return data.updateTeam;
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
