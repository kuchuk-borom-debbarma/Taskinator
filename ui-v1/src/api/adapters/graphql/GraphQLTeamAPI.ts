import type { TeamAPI } from '../../interfaces/TeamAPI';
import type { Team, Member } from '../../types';
import { graphql } from '../../../gql';
import { print } from 'graphql';
import type { GetTeamsQuery, GetTeamMembersQuery } from '../../../gql/graphql';
import { AuthenticationError } from '../../errors';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export class GraphQLTeamAPI implements TeamAPI {
  private token: string | null;
  private onUnauthorized?: () => void;
  private static queryCache = new Map<any, string>();

  constructor(token: string | null, options?: { onUnauthorized?: () => void }) {
    this.token = token;
    this.onUnauthorized = options?.onUnauthorized;
  }

  private async query<T>(query: any, variables: any = {}): Promise<T> {
    let queryStr: string;
    
    if (typeof query === 'string') {
      queryStr = query;
    } else {
      if (GraphQLTeamAPI.queryCache.has(query)) {
        queryStr = GraphQLTeamAPI.queryCache.get(query)!;
      } else {
        queryStr = print(query);
        GraphQLTeamAPI.queryCache.set(query, queryStr);
      }
    }

    const operationMatch = queryStr.match(/(query|mutation)\s+(\w+)/);
    const opName = operationMatch?.[2] || 'Anonymous';
    const start = performance.now();

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ query: queryStr, variables }),
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
      console.log('Query:', queryStr);
      console.groupEnd();

      const firstError = result.errors[0];
      if (firstError.extensions?.code === 'UNAUTHENTICATED') {
        this.onUnauthorized?.();
        throw new AuthenticationError();
      }
      throw new Error(firstError.message);
    }

    console.groupCollapsed(
      `%c[GQL SUCCESS] %c${opName} %c(${duration}ms)`,
      'color: #10b981; font-size: 10px;',
      'color: #3b82f6; font-weight: bold;',
      'color: #94a3b8; font-weight: normal;'
    );
    console.log('Data:', result.data);
    console.log('Variables:', variables);
    console.groupEnd();

    return result.data as T;
  }

  async getTeams(projectId: string, first?: number, after?: string): Promise<{ teams: Team[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<GetTeamsQuery>(graphql(`
      query GetTeams($projectId: ID!, $first: Int, $after: String) {
        teams(projectId: $projectId, first: $first, after: $after) {
          edges {
            node {
              id
              name
              projectId
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `), { projectId, first, after });
    
    return {
      teams: data.teams.edges.map(e => e.node),
      hasNextPage: data.teams.pageInfo.hasNextPage,
      endCursor: data.teams.pageInfo.endCursor || null
    };
  }

  async getTeamMembers(projectId: string, teamId: string, first?: number, after?: string): Promise<{ members: Member[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<GetTeamMembersQuery>(graphql(`
      query GetTeamMembers($projectId: ID!, $teamId: ID!, $first: Int, $after: String) {
        teamMembers(projectId: $projectId, teamId: $teamId, first: $first, after: $after) {
          edges {
            node {
              id
              user {
                id
                username
                email
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `), { projectId, teamId, first, after });

    return {
      members: data.teamMembers.edges.map(e => ({
        id: e.node.user?.id || '',
        username: e.node.user?.username || '',
        email: e.node.user?.email || '',
      })),
      hasNextPage: data.teamMembers.pageInfo.hasNextPage,
      endCursor: data.teamMembers.pageInfo.endCursor || null
    };
  }

  async createTeam(projectId: string, name: string): Promise<{ success: boolean; team?: Team }> {
    const data = await this.query<any>(`
      mutation CreateTeam($projectId: ID!, $name: String!) {
        createTeam(projectId: $projectId, name: $name) {
          success
          team { id name projectId }
        }
      }
    `, { projectId, name });
    return data.createTeam;
  }

  async deleteTeams(projectId: string, teamIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const data = await this.query<any>(`
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
    const data = await this.query<any>(`
      mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [String!]!) {
        addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
          success
        }
      }
    `, { projectId, teamId, userIds });
    return data.addTeamMembers;
  }

  async removeTeamMembers(projectId: string, teamId: string, userIds: string[]): Promise<{ success: boolean }> {
    const data = await this.query<any>(`
      mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [String!]!) {
        removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
          success
        }
      }
    `, { projectId, teamId, userIds });
    return data.removeTeamMembers;
  }
}
