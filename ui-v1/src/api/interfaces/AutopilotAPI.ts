export interface AutopilotConditionNode {
  type: 'and' | 'or' | 'not' | 'predicate';
  children?: AutopilotConditionNode[];
  child?: AutopilotConditionNode;
  domain?: string;
  field?: string;
  operator?: string;
  value?: any;
}

export interface AutopilotAction {
  id: string;
  type: string;
  config: Record<string, any>;
  position: number;
}

export interface AutopilotItem {
  id: string;
  fk_project_id: string;
  triggers: string[];
  conditions: AutopilotConditionNode;
  isActive: boolean;
  actions: AutopilotAction[];
  createdAt: string;
  version: number;
}

export interface AutopilotPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface AutopilotPage {
  autopilots: AutopilotItem[];
  totalCount: number;
  pageInfo: AutopilotPageInfo;
}

export interface AutopilotPaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface AutopilotAPI {
  getProjectAutopilots(
    projectId: string,
    pagination?: AutopilotPaginationArgs
  ): Promise<AutopilotPage>;
}
