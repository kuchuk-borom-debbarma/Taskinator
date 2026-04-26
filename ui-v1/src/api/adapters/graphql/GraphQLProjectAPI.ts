import type { ProjectAPI } from '../../interfaces/ProjectAPI';
import type { Project, ProjectMember } from '../../types';
import { AuthenticationError } from '../../errors';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

const gql = String.raw;

export class GraphQLProjectAPI implements ProjectAPI {
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

  async getProjects(first?: number, after?: string): Promise<{ projects: Project[], hasNextPage: boolean, endCursor: string | null, totalCount?: number }> {
    const data = await this.query<any>(gql`
      query GetMyProjects($first: Int, $after: String) {
        me {
          projects(first: $first, after: $after) {
            edges {
              node {
                id
                name
                description
                createdAt
                updatedAt
                version
                creator { id username }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
          }
        }
      }
    `, { first, after });

    if (!data.me?.projects) return { projects: [], hasNextPage: false, endCursor: null };

    return {
      projects: data.me.projects.edges.map((e: any) => ({
        ...e.node,
        description: e.node.description ?? undefined,
      })),
      hasNextPage: data.me.projects.pageInfo.hasNextPage,
      endCursor: data.me.projects.pageInfo.endCursor || null,
      totalCount: data.me.projects.totalCount,
    };
  }

  async getProject(id: string): Promise<Project | null> {
    const data = await this.query<any>(gql`
      query GetProject($id: ID!) {
        project(id: $id) {
          id
          name
          description
          createdAt
          updatedAt
          version
          creator { id username }
        }
      }
    `, { id });

    if (!data.project) return null;
    return {
      ...data.project,
      description: data.project.description ?? undefined,
    };
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const data = await this.query<any>(gql`
      mutation CreateProject($name: String!, $description: String) {
        createProject(name: $name, description: $description) {
          id
          name
          description
          createdAt
          updatedAt
          version
          creator { id username }
        }
      }
    `, { name, description });
    return data.createProject;
  }

  async updateProject(id: string, version: number, name?: string, description?: string): Promise<Project> {
    const data = await this.query<any>(gql`
      mutation UpdateProject($id: ID!, $version: Int!, $name: String, $description: String) {
        updateProject(id: $id, version: $version, name: $name, description: $description) {
          id
          name
          description
          createdAt
          updatedAt
          version
          creator { id username }
        }
      }
    `, { id, version, name, description });
    return data.updateProject;
  }

  async deleteProjects(projectIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const data = await this.query<any>(gql`
      mutation DeleteProjects($projectIds: [ID!]!) {
        deleteProjects(projectIds: $projectIds) {
          success
          deletedCount
        }
      }
    `, { projectIds });
    return data.deleteProjects;
  }

  async addProjectMembers(projectId: string, userIds: string[]): Promise<{ success: boolean }> {
    const data = await this.query<any>(gql`
      mutation AddProjectMembers($projectId: ID!, $userIds: [ID!]!) {
        addProjectMembers(projectId: $projectId, userIds: $userIds) {
          success
        }
      }
    `, { projectId, userIds });
    return data.addProjectMembers;
  }

  async removeProjectMembers(projectId: string, memberIds: string[]): Promise<{ success: boolean }> {
    const data = await this.query<any>(gql`
      mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {
        removeProjectMembers(projectId: $projectId, memberIds: $memberIds) {
          success
        }
      }
    `, { projectId, memberIds });
    return data.removeProjectMembers;
  }

  async getProjectMembers(projectId: string, first?: number, after?: string): Promise<{ members: ProjectMember[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<any>(gql`
      query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {
        project(id: $projectId) {
          projectMembers(first: $first, after: $after) {
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
              endCursor
            }
          }
        }
      }
    `, { projectId, first, after });

    if (!data.project?.projectMembers) return { members: [], hasNextPage: false, endCursor: null };

    return {
      members: data.project.projectMembers.edges.map((e: any) => e.node),
      hasNextPage: data.project.projectMembers.pageInfo.hasNextPage,
      endCursor: data.project.projectMembers.pageInfo.endCursor ?? null,
    };
  }
}
