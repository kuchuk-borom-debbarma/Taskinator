import type { PageInfo, PaginationArgs, ProjectTask, TaskLink, NeighbourDirection } from '../types';

export interface TaskAPI {
  getTasks(
    projectId: string,
    params?: PaginationArgs & {
      teamId?: string,
      memberId?: string,
    }
  ): Promise<{ tasks: ProjectTask[], pageInfo: PageInfo }>;

  getTask(id: string): Promise<ProjectTask | null>;

  getTaskDetail(id: string): Promise<{
    task: ProjectTask | null,
    incoming: { links: TaskLink[], pageInfo: PageInfo },
    outgoing: { links: TaskLink[], pageInfo: PageInfo },
  }>;

  createTask(input: { projectId: string; title: string; description?: string; status?: string; priority?: number }): Promise<ProjectTask>;

  updateTask(taskId: string, input: { 
    projectId: string; 
    version: number; 
    title?: string; 
    description?: string; 
    status?: string; 
    teamId?: string | null; 
    memberId?: string | null;
    priority?: number;
  }): Promise<ProjectTask>;

  deleteTask(projectId: string, taskId: string): Promise<string>;

  createTaskLink(input: { projectId: string; sourceTaskId: string; targetTaskId: string; label: string }): Promise<TaskLink>;
  
  updateTaskLink(input: { projectId: string; linkId: string; sourceTaskId?: string; targetTaskId?: string; label?: string }): Promise<TaskLink>;

  deleteTaskLink(projectId: string, linkId: string): Promise<string>;

  getTaskNeighbourLinks(
    taskId: string,
    direction?: NeighbourDirection,
    depthLimit?: number,
    pagination?: PaginationArgs
  ): Promise<{ links: TaskLink[], pageInfo: PageInfo }>;

  getTaskGraphPage(
    taskId: string,
    params?: PaginationArgs & {
      depthLimit?: number,
    }
  ): Promise<{
    task: ProjectTask | null,
    links: TaskLink[],
    pageInfo: PageInfo,
  }>;

  getBehaviorSettingsCatalog(projectId: string): Promise<BehaviorSettingsCatalog>;
  getBehaviorRules(projectId: string): Promise<BehaviorRule[]>;
  createBehaviorRule(input: CreateBehaviorRuleInput): Promise<BehaviorRule>;
  updateBehaviorRule(id: string, version: number, input: UpdateBehaviorRuleInput): Promise<BehaviorRule>;
  deleteBehaviorRule(id: string): Promise<boolean>;
}

export interface BehaviorSetting {
  id: string;
  name: string;
  description: string;
  category: 'GUARD' | 'CASCADE' | 'AUTOMATION';
  defaultValue: boolean;
}

export interface BehaviorSettingsCatalog {
  settings: BehaviorSetting[];
}

export interface BehaviorRule {
  id: string;
  name: string;
  isActive: boolean;
  behaviorType: string;
  fkTaskId: string | null;
  criteriaField: string | null;
  criteriaOperator: string | null;
  criteriaValue: string | null;
  actionMessage: string | null;
  actionValue: string | null;
  version: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateBehaviorRuleInput {
  projectId: string;
  name: string;
  behaviorType: string;
  isActive?: boolean;
  fkTaskId?: string | null;
  criteriaField?: string | null;
  criteriaOperator?: string | null;
  criteriaValue?: string | null;
  actionMessage?: string | null;
  actionValue?: string | null;
}

export interface UpdateBehaviorRuleInput {
  name?: string;
  isActive?: boolean;
  fkTaskId?: string | null;
  criteriaField?: string | null;
  criteriaOperator?: string | null;
  criteriaValue?: string | null;
  actionMessage?: string | null;
  actionValue?: string | null;
}

