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
  priority: number;
  createdById: string;
  dueDate?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  totalIncomingLinksCount: number;
  totalOutgoingLinksCount: number;
  directIncomingLinksCount: number;
  directOutgoingLinksCount: number;
  incomingLabelCounts: Record<string, number>;
  outgoingLabelCounts: Record<string, number>;
  team?: Team;
  assignee?: Member;
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

export interface TaskStoryNode {
  taskId: string;
  title: string;
  label: string;
}

export interface TaskStory {
  id: string; // Unique path identifier
  depth: number;
  direction: 'incoming' | 'outgoing';
  path: TaskStoryNode[]; // The discovery chain [Focus -> Link A -> Task A]
  finalTask: ProjectTask;
}

export interface TaskNeighbourhood {
  focusedTask: ProjectTask;
  nodes: NeighbourhoodNode[];
  edges: TaskLink[];
  incomingStories: TaskStory[];
  outgoingStories: TaskStory[];
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
