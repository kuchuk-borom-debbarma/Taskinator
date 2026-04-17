import type { ProjectAPI } from '../../interfaces/ProjectAPI';
import type { Project } from '../../types';
import { graphql } from '../../../gql';
import { print } from 'graphql';
import type { GetProjectsQuery, GetProjectQuery, CreateProjectMutation } from '../../../gql/graphql';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export class GraphQLProjectAPI implements ProjectAPI {
  private token: string | null;
  constructor(token: string | null) {
    this.token = token;
  }

  private async query<T>(query: any, variables: any = {}): Promise<T> {
    const queryStr = typeof query === 'string' ? query : print(query);
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
      console.error('GraphQL Project API Error:', result.errors);
      throw new Error(result.errors[0].message);
    }
    return result.data as T;
  }

  async getProjects(first?: number, after?: string): Promise<{ projects: Project[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<GetProjectsQuery>(graphql(`
      query GetProjects($first: Int, $after: String) {
        projects(first: $first, after: $after) {
          edges {
            node {
              id
              name
              description
              createdAt
              version
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `), { first, after });
    
    return {
      projects: data.projects.edges.map((e: any) => e.node),
      hasNextPage: data.projects.pageInfo.hasNextPage,
      endCursor: data.projects.pageInfo.endCursor || null
    };
  }

  async getProject(id: string): Promise<Project | null> {
    const data = await this.query<GetProjectQuery>(graphql(`
      query GetProject($id: ID!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          version
        }
      }
    `), { id });
    if (!data.project) return null;
    return {
      ...data.project,
      description: data.project.description ?? undefined
    } as Project;
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const data = await this.query<CreateProjectMutation>(graphql(`
      mutation CreateProject($name: String!, $description: String) {
        createProject(name: $name, description: $description) {
          id
          name
          description
          createdAt
          version
        }
      }
    `), { name, description });
    return data.createProject as Project;
  }
}
