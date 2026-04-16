export type TaskStatus = 'Backlog' | 'Ready' | 'Doing' | 'Review' | 'Done' | 'Blocked';

export type LinkKind = 'blocks' | 'depends-on' | 'relates' | 'handoff';

export interface Task {
  id: string;
  index: number;
  title: string;
  summary: string;
  status: TaskStatus;
  owner: string;
  team: string;
  memberName: string;
  teamName: string;
  priority: 'Low' | 'Medium' | 'High';
  progress: number;
  parentId: string | null;
  childIds: string[];
  updatedAt: string;
}

export interface TaskLink {
  id: string;
  fromId: string;
  toId: string;
  kind: LinkKind;
}

export interface TaskStory {
  id: string;
  originId: string;
  terminalId: string;
  pathTaskIds: string[];
  pathLinkTypes: LinkKind[];
  depth: number;
}

export interface TaskPage {
  tasks: Task[];
  links: TaskLink[];
  stories: TaskStory[];
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface RouteState {
  projectId: string;
  taskId: string;
  page: number;
  view: 'trail';
}
