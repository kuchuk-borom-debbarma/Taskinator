export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  version: number;
  
  // Dashboard fields
  teamCount?: number;
  taskCount?: number;
  memberCount?: number;
  taskLabelCounts?: { label: string; count: number }[];

  // Connections
  myTeams?: Team[];
  myTasks?: ProjectTask[];
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
  incomingLabelCounts: { label: string; count: number }[];
  outgoingLabelCounts: { label: string; count: number }[];
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
  memberCount?: number;
  taskCount?: number;
}

export interface Member {
  id: string;
  username: string;
  email: string;
}
