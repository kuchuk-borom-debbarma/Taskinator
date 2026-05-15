import type {
  AutopilotAPI,
  AutopilotPage,
  AutopilotPaginationArgs,
  CreateAutopilotInput,
  AutopilotItem,
} from '../../interfaces/AutopilotAPI';
import { AuthenticationError } from '../../errors';
import { CONFIG } from '../../../config';

const GRAPHQL_URL = CONFIG.API_URL;
const gql = String.raw;

export class GraphQLAutopilotAPI implements AutopilotAPI {
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
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
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

  async getProjectAutopilots(
    projectId: string,
    pagination: AutopilotPaginationArgs = {}
  ): Promise<AutopilotPage> {
    const data = await this.query<any>(
      gql`
        query GetProjectAutopilots(
          $projectId: ID!
          $first: Int
          $after: String
          $last: Int
          $before: String
        ) {
          autopilots(
            projectId: $projectId
            first: $first
            after: $after
            last: $last
            before: $before
          ) {
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                fk_project_id
                triggers
                isActive
                conditions
                createdAt
                version
                actions {
                  id
                  type
                  config
                  position
                }
              }
            }
          }
        }
      `,
      { projectId, ...pagination }
    );

    const connection = data?.autopilots;
    if (!connection) {
      return {
        autopilots: [],
        totalCount: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      };
    }

    return {
      autopilots: connection.edges.map((e: any) => e.node),
      totalCount: connection.totalCount ?? 0,
      pageInfo: {
        hasNextPage: connection.pageInfo.hasNextPage,
        hasPreviousPage: connection.pageInfo.hasPreviousPage,
        startCursor: connection.pageInfo.startCursor ?? null,
        endCursor: connection.pageInfo.endCursor ?? null,
      },
    };
  }

  async createAutopilot(input: CreateAutopilotInput): Promise<AutopilotItem> {
    const data = await this.query<any>(
      gql`
        mutation CreateAutopilot($input: CreateAutopilotInput!) {
          createAutopilot(input: $input) {
            id
            fk_project_id
            triggers
            isActive
            conditions
            createdAt
            version
            actions {
              id
              type
              config
              position
            }
          }
        }
      `,
      { input }
    );
    return data.createAutopilot;
  }

  async toggleAutopilot(id: string, isActive: boolean): Promise<AutopilotItem> {
    const data = await this.query<any>(
      gql`
        mutation ToggleAutopilot($id: ID!, $isActive: Boolean!) {
          toggleAutopilot(id: $id, isActive: $isActive) {
            id
            fk_project_id
            triggers
            isActive
            conditions
            createdAt
            version
            actions {
              id
              type
              config
              position
            }
          }
        }
      `,
      { id, isActive }
    );
    return data.toggleAutopilot;
  }
}

