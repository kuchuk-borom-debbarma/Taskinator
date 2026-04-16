export type ViewMode = 'trail';

export interface RouteState {
  projectId: string | null;
  taskId: string | null;
  page: number;
  view: ViewMode;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  userId: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Team {
  id: string;
  name: string;
  projectId: string;
}

export interface TaskLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  label: string;
  createdAt: string;
}

export interface TaskPath {
  id: string;
  originTaskId: string;
  terminalTaskId: string;
  pathTaskIds: string[];
  pathLinkIds: string[];
  pathLinkLabels: string[];
  depth: number;
  pathTasks: Task[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  projectId: string;
  teamId?: string | null;
  team?: Team | null;
  memberId?: string | null;
  assignee?: User | null;
  createdBy: string;
  creator?: User | null;
  createdAt: string;
  updatedAt?: string | null;
  version: number;
  links: TaskLink[];
  story: TaskPath[];
}

export interface TaskConnection {
  edges: Array<{ node: Task; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
}

export interface TaskPage {
  tasks: Task[];
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface TaskNetwork {
  incoming: TaskPath[];
  outgoing: TaskPath[];
}
