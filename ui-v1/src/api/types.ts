export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  username: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  creator?: User;
  createdAt: string;
  updatedAt?: string;
  version: number;
  projectMembersCount: number;
  tasksCount: number;
  teamsCount: number;
}

export interface ProjectMember {
  id: string;
  user?: User;
  createdAt: string;
  version: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  dueDate?: string;
  project?: Project;
  team?: Team;
  assignedMember?: User;
  createdBy?: User;
  updatedBy?: User;
  version: number;
  lastEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLink {
  id: string;
  source: ProjectTask;
  target: ProjectTask;
  label: string;
  createdBy?: User;
  createdAt: string;
  updatedBy?: User;
  updatedAt?: string;
}

export type NeighbourDirection = 'incoming' | 'outgoing' | 'both';

export interface Team {
  id: string;
  name: string;
  project?: Project;
  createdBy?: User;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  lastEventId?: string;
}

export interface TeamMember {
  id: string;
  user?: User;
  team?: Team;
  createdAt: string;
  version: number;
}

export interface GraphNode {
  task: ProjectTask;
  direction: NeighbourDirection;
  depth?: number;
}

export interface GraphEdge {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  label: string;
}

export interface TaskStoryNode {
  taskId: string;
  title: string;
  label: string;
}

export interface TaskStory {
  id: string;
  depth: number;
  direction: 'incoming' | 'outgoing';
  path: TaskStoryNode[];
  finalTask: ProjectTask;
}

export interface TaskNeighbourhood {
  focusedTask: ProjectTask;
  nodes: GraphNode[];
  edges: GraphEdge[];
  incomingStories: TaskStory[];
  outgoingStories: TaskStory[];
  hasNextPage: boolean;
  endCursor?: string;
}
