import type { ProjectAPI } from '../../interfaces/ProjectAPI';
import type { Project } from '../../types';
import { graphql } from '../../../gql';
import { print } from 'graphql';
import type { GetProjectsQuery, GetProjectQuery, CreateProjectMutation } from '../../../gql/graphql';
import { AuthenticationError } from '../../errors';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export class GraphQLProjectAPI implements ProjectAPI {
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
      if (GraphQLProjectAPI.queryCache.has(query)) {
        queryStr = GraphQLProjectAPI.queryCache.get(query)!;
      } else {
        queryStr = print(query);
        GraphQLProjectAPI.queryCache.set(query, queryStr);
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
          teamCount
          taskCount
          memberCount
          taskLabelCounts {
            label
            count
          }
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

  async deleteProjects(projectIds: string[]): Promise<{ success: boolean; deletedCount: number }> {
    const data = await this.query<any>(`
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
    const data = await this.query<any>(`
      mutation AddProjectMembers($projectId: ID!, $userIds: [String!]!) {
        addProjectMembers(projectId: $projectId, userIds: $userIds) {
          success
        }
      }
    `, { projectId, userIds });
    return data.addProjectMembers;
  }

  async removeProjectMembers(projectId: string, memberIds: string[]): Promise<{ success: boolean; removedCount: number }> {
    const data = await this.query<any>(`
      mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {
        removeProjectMembers(projectId: $projectId, memberIds: $memberIds) {
          success
          removedCount
        }
      }
    `, { projectId, memberIds });
    return data.removeProjectMembers;
  }

  async getProjectStats(projectId: string): Promise<{ teamCount: number; taskCount: number }> {
    const data = await this.query<any>(graphql(`
      query GetProjectStats($projectId: ID!) {
        project(id: $projectId) {
          teamCount
          taskCount
        }
      }
    `), { projectId });
    return {
      teamCount: data.project.teamCount,
      taskCount: data.project.taskCount,
    };
  }

  async getWorkspaceStats(): Promise<{ projectCount: number; teamCount: number; assignedTaskCount: number }> {
    const data = await this.query<any>(`
      query GetWorkspaceStats {
        workspaceStats {
          projectCount
          teamCount
          assignedTaskCount
        }
      }
    `, {});
    return data.workspaceStats;
  }

  async getProjectMembers(projectId: string, first?: number, after?: string): Promise<{ members: any[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<any>(graphql(`
      query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {
        project(id: $projectId) {
          members(first: $first, after: $after) {
            edges {
              node {
                id
                user {
                  id
                  username
                  email
                }
                createdAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `), { projectId, first, after });

    if (!data.project) return { members: [], hasNextPage: false, endCursor: null };

    return {
      members: data.project.members.edges.map((e: any) => e.node),
      hasNextPage: data.project.members.pageInfo.hasNextPage,
      endCursor: data.project.members.pageInfo.endCursor ?? null,
    };
  }
}
