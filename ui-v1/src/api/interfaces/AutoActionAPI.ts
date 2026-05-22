export interface AutoActionConditionNode {
  type: 'and' | 'or' | 'not' | 'predicate';
  children?: AutoActionConditionNode[];
  child?: AutoActionConditionNode;
  domain?: string;
  field?: string;
  operator?: string;
  value?: any;
}

export interface AutoActionAction {
  id: string;
  type: string;
  config: Record<string, any>;
  position: number;
}

export interface AutoActionItem {
  id: string;
  fk_project_id: string;
  triggers: string[];
  conditions: AutoActionConditionNode;
  isActive: boolean;
  actions: AutoActionAction[];
  createdAt: string;
  version: number;
}

export interface AutoActionPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface AutoActionPage {
  autoActions: AutoActionItem[];
  totalCount: number;
  pageInfo: AutoActionPageInfo;
}

export interface AutoActionPaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface CreateAutoActionInput {
  projectId: string;
  triggers: string[];
  conditions: AutoActionConditionNode;
  actions: {
    type: string;
    config: Record<string, any>;
    position: number;
  }[];
}

export interface AutoActionAPI {
  getProjectAutoActions(
    projectId: string,
    pagination?: AutoActionPaginationArgs
  ): Promise<AutoActionPage>;

  createAutoAction(input: CreateAutoActionInput): Promise<AutoActionItem>;

  toggleAutoAction(id: string, isActive: boolean): Promise<AutoActionItem>;
}

