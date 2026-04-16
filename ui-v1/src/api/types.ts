export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  version: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  teamId?: string;
  memberId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLink {
  id: string;
  projectId: string;
  sourceTaskId: string;
  targetTaskId: string;
  label: string;
  createdAt: string;
}

export type NeighbourDirection = 'incoming' | 'outgoing' | 'both';

export interface NeighbourhoodNode {
  task: ProjectTask;
  depth: number;
  direction: NeighbourDirection;
}

export interface TaskNeighbourhood {
  focusedTask: ProjectTask;
  nodes: NeighbourhoodNode[];
  edges: TaskLink[];
  hasNextPage: boolean;
  endCursor?: string;
}

export interface Team {
  id: string;
  name: string;
  projectId: string;
}

export interface Member {
  id: string;
  username: string;
  email: string;
}
