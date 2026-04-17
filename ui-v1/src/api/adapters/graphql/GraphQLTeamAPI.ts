import type { TeamAPI } from '../../interfaces/TeamAPI';
import type { Team, Member } from '../../types';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export class GraphQLTeamAPI implements TeamAPI {
  constructor(private token: string | null) {}

  private async query<T>(query: string, variables: any = {}): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (result.errors) {
      console.error('GraphQL Team API Error:', result.errors);
      throw new Error(result.errors[0].message);
    }
    return result.data as T;
  }

  async getProjectTeams(projectId: string): Promise<Team[]> {
    const data = await this.query<{ projectTeams: { edges: { node: any }[] } }>(`
      query GetProjectTeams($projectId: ID!) {
        projectTeams(projectId: $projectId) {
          edges {
            node {
              id
              name
              projectId
            }
          }
        }
      }
    `, { projectId });
    return data.projectTeams.edges.map(e => e.node);
  }

  async getTeamMembers(teamId: string): Promise<Member[]> {
    const data = await this.query<{ teamMembers: { edges: { node: any }[] } }>(`
      query GetTeamMembers($teamId: ID!) {
        teamMembers(teamId: $teamId) {
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
    `, { teamId });
    return data.teamMembers.edges.map(e => ({
      id: e.node.user.id,
      username: e.node.user.username,
      email: e.node.user.email,
    }));
  }
}
