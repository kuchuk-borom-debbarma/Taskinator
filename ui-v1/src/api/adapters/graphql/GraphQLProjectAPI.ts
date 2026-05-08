import type { ProjectAPI } from '../../interfaces/ProjectAPI';
import type { PageInfo, PaginationArgs, Project, ProjectMember, ProjectTask, Team } from '../../types';
import { AuthenticationError } from '../../errors';

import { CONFIG } from '../../../config';

const GRAPHQL_URL = CONFIG.API_URL;

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

  async getProjects(pagination?: PaginationArgs): Promise<{ projects: Project[], pageInfo: PageInfo, totalCount?: number }> {
    const data = await this.query<any>(gql`
      query GetMyProjects($first: Int, $after: String, $last: Int, $before: String) {
        me {
          projects(first: $first, after: $after, last: $last, before: $before) {
            edges {
              node {
                id
                name
                description
                createdAt
                updatedAt
                version
                projectMembersCount
                tasksCount
                teamsCount
                creator { id username }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      }
    `, { ...pagination });

    if (!data.me?.projects) return { projects: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };

    return {
      projects: data.me.projects.edges.map((e: any) => ({
        ...e.node,
        description: e.node.description ?? undefined,
      })),
      pageInfo: {
        hasNextPage: data.me.projects.pageInfo.hasNextPage,
        hasPreviousPage: data.me.projects.pageInfo.hasPreviousPage,
        startCursor: data.me.projects.pageInfo.startCursor || null,
        endCursor: data.me.projects.pageInfo.endCursor || null,
      },
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
          projectMembersCount
          tasksCount
          teamsCount
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

  async getProjectDashboardData(projectId: string): Promise<{
    project: Project | null,
    teams: Team[],
    tasks: ProjectTask[],
    members: ProjectMember[],
  }> {
    const data = await this.query<any>(gql`
      query GetProjectDashboardData($projectId: ID!, $teamsFirst: Int, $tasksFirst: Int, $membersFirst: Int) {
        project(id: $projectId) {
          id
          name
          description
          createdAt
          updatedAt
          version
          projectMembersCount
          tasksCount
          teamsCount
          creator { id username }
          teams(first: $teamsFirst) {
            edges {
              node {
                id
                name
                createdAt
                updatedAt
                version
              }
            }
          }
          projectTasks(first: $tasksFirst) {
            edges {
              node {
                id
                title
                description
                status
                priority
                dueDate
                version
                createdAt
                updatedAt
                project { id name }
                team { id name }
                assignedMember { id username }
                createdBy { id username }
                updatedBy { id username }
              }
            }
          }
          projectMembers(first: $membersFirst) {
            edges {
              node {
                id
                user { id username }
                createdAt
                version
              }
            }
          }
        }
      }
    `, { 
      projectId, 
      teamsFirst: CONFIG.PAGINATION.DASHBOARD_TEAMS, 
      tasksFirst: CONFIG.PAGINATION.DASHBOARD_TASKS, 
      membersFirst: CONFIG.PAGINATION.MEMBERS_LIST // Note: Dashboard members uses members list limit
    });

    if (!data.project) {
      return { project: null, teams: [], tasks: [], members: [] };
    }

    return {
      project: {
        ...data.project,
        description: data.project.description ?? undefined,
      },
      teams: data.project.teams?.edges.map((e: any) => e.node) || [],
      tasks: data.project.projectTasks?.edges.map((e: any) => e.node) || [],
      members: data.project.projectMembers?.edges.map((e: any) => e.node) || [],
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

  async getProjectMembers(projectId: string, pagination?: PaginationArgs): Promise<{ members: ProjectMember[], pageInfo: PageInfo }> {
    const data = await this.query<any>(gql`
      query GetProjectMembers($projectId: ID!, $first: Int, $after: String, $last: Int, $before: String) {
        project(id: $projectId) {
          projectMembers(first: $first, after: $after, last: $last, before: $before) {
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
    `, { projectId, ...pagination });

    if (!data.project?.projectMembers) return { members: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };

    return {
      members: data.project.projectMembers.edges.map((e: any) => e.node),
      pageInfo: {
        hasNextPage: data.project.projectMembers.pageInfo.hasNextPage,
        hasPreviousPage: data.project.projectMembers.pageInfo.hasPreviousPage,
        startCursor: data.project.projectMembers.pageInfo.startCursor ?? null,
        endCursor: data.project.projectMembers.pageInfo.endCursor ?? null,
      }
    };
  }

  async getProjectLinks(projectId: string, pagination?: PaginationArgs): Promise<{ links: any[], pageInfo: PageInfo }> {
    const data = await this.query<any>(gql`
      query GetProjectLinks($projectId: ID!, $first: Int, $after: String, $last: Int, $before: String) {
        project(id: $projectId) {
          projectLinks(first: $first, after: $after, last: $last, before: $before) {
            edges {
              node {
                id
                label
                source { id title status }
                target { id title status }
                createdAt
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
    `, { projectId, ...pagination });

    if (!data.project?.projectLinks) return { links: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };

    return {
      links: data.project.projectLinks.edges.map((e: any) => e.node),
      pageInfo: {
        hasNextPage: data.project.projectLinks.pageInfo.hasNextPage,
        hasPreviousPage: data.project.projectLinks.pageInfo.hasPreviousPage,
        startCursor: data.project.projectLinks.pageInfo.startCursor ?? null,
        endCursor: data.project.projectLinks.pageInfo.endCursor ?? null,
      }
    };
  }
}
