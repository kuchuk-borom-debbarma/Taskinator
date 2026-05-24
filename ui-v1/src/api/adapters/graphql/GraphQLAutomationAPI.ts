import { CONFIG } from '../../../config';
import { AuthenticationError } from '../../errors';
import type {
  AutomationAPI,
  AutomationTemplatesCatalog,
  CreateTaskAutomationRuleInput,
  TaskAutomationRule,
  UpdateTaskAutomationRuleInput,
} from '../../interfaces/AutomationAPI';

const GRAPHQL_URL = CONFIG.API_URL;
const gql = String.raw;

const RULE_FIELDS = `
  id
  projectId
  name
  isActive
  isSync
  triggerType
  triggerValue
  conditionType
  conditionValue
  actionType
  actionValue
  version
`;

const CATALOG_FIELDS = `
  triggers {
    type
    label
    description
    compatibleConditions
    compatibleActions
    valueTemplate {
      inputType
      label
      placeholder
      dynamicOptionsSource
      staticOptions { value label }
    }
  }
  conditions {
    type
    label
    description
    valueTemplate {
      inputType
      label
      placeholder
      dynamicOptionsSource
      staticOptions { value label }
    }
  }
  actions {
    type
    label
    description
    valueTemplate {
      inputType
      label
      placeholder
      dynamicOptionsSource
      staticOptions { value label }
    }
  }
`;

export class GraphQLAutomationAPI implements AutomationAPI {
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

  async getTemplatesCatalog(projectId: string): Promise<AutomationTemplatesCatalog> {
    const data = await this.query<any>(gql`
      query GetAutomationTemplatesCatalog($projectId: ID!) {
        automationTemplatesCatalog(projectId: $projectId) {
          ${CATALOG_FIELDS}
        }
      }
    `, { projectId });

    return data.automationTemplatesCatalog;
  }

  async getRules(projectId: string): Promise<TaskAutomationRule[]> {
    const data = await this.query<any>(gql`
      query GetTaskAutomationRules($projectId: ID!) {
        taskAutomationRules(projectId: $projectId) {
          ${RULE_FIELDS}
        }
      }
    `, { projectId });

    return data.taskAutomationRules ?? [];
  }

  async createRule(input: CreateTaskAutomationRuleInput): Promise<TaskAutomationRule> {
    const data = await this.query<any>(gql`
      mutation CreateTaskAutomationRule($input: CreateTaskAutomationRuleInput!) {
        createTaskAutomationRule(input: $input) {
          ${RULE_FIELDS}
        }
      }
    `, { input });

    return data.createTaskAutomationRule;
  }

  async updateRule(input: UpdateTaskAutomationRuleInput): Promise<TaskAutomationRule> {
    const { id, ...rest } = input;
    const data = await this.query<any>(gql`
      mutation UpdateTaskAutomationRule($input: UpdateTaskAutomationRuleInput!) {
        updateTaskAutomationRule(input: $input) {
          ${RULE_FIELDS}
        }
      }
    `, {
      input: {
        ...rest,
        ruleId: id,
      },
    });

    return data.updateTaskAutomationRule;
  }

  async deleteRule(projectId: string, ruleId: string): Promise<boolean> {
    const data = await this.query<any>(gql`
      mutation DeleteTaskAutomationRule($projectId: ID!, $ruleId: ID!) {
        deleteTaskAutomationRule(projectId: $projectId, ruleId: $ruleId) {
          success
        }
      }
    `, { projectId, ruleId });

    return !!data.deleteTaskAutomationRule?.success;
  }
}
