import type { ProjectAPI } from '../../interfaces/ProjectAPI';
import type { Project } from '../../types';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export class GraphQLProjectAPI implements ProjectAPI {
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
      console.error('GraphQL Project API Error:', result.errors);
      throw new Error(result.errors[0].message);
    }
    return result.data as T;
  }

  async getProjects(): Promise<Project[]> {
    const data = await this.query<{ projects: { edges: { node: any }[] } }>(`
      query GetProjects {
        projects {
          edges {
            node {
              id
              name
              description
              createdAt
              version
            }
          }
        }
      }
    `);
    return data.projects.edges.map(e => e.node);
  }

  async getProject(id: string): Promise<Project | null> {
    const data = await this.query<{ project: any }>(`
      query GetProject($id: ID!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          version
        }
      }
    `, { id });
    return data.project || null;
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const data = await this.query<{ createProject: any }>(`
      mutation CreateProject($name: String!, $description: String) {
        createProject(name: $name, description: $description) {
          id
          name
          description
          createdAt
          version
        }
      }
    `, { name, description });
    return data.createProject;
  }
}
