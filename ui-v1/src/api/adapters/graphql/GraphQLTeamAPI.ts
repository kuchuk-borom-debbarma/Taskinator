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

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ query: queryStr, variables }),
    });

    const result = await response.json();
    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      const firstError = result.errors[0];
      if (firstError.extensions?.code === 'UNAUTHENTICATED') {
        this.onUnauthorized?.();
        throw new AuthenticationError();
      }
      throw new Error(firstError.message);
    }
    return result.data as T;
  }

  async getTeams(projectId: string): Promise<Team[]> {
    const data = await this.query<GetTeamsQuery>(graphql(`
      query GetTeams($projectId: ID!) {
        teams(projectId: $projectId) {
          edges {
            node {
              id
              name
              projectId
            }
          }
        }
      }
    `), { projectId });
    return data.teams.edges.map((e: any) => e.node);
  }

  async getTeamMembers(projectId: string, teamId: string): Promise<Member[]> {
    const data = await this.query<GetTeamMembersQuery>(graphql(`
      query GetTeamMembers($projectId: ID!, $teamId: ID!) {
        teamMembers(projectId: $projectId, teamId: $teamId) {
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
        }
      }
    `), { projectId, teamId });
    return data.teamMembers.edges.map(e => ({
      id: e.node.user?.id || '',
      username: e.node.user?.username || '',
      email: e.node.user?.email || '',
    }));
  }
}
