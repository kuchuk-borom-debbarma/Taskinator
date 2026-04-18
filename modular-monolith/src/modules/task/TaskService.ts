import type { BaseService } from './index.ts';

export type TaskStatus = string;

export type ProjectTask = {
    id: string;
    projectId: string;
    teamId: string | null;
    memberId: string | null;
    title: string;
    description: string;
    status: TaskStatus;
    version: number;
    lastEventId: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
    directIncomingCount: number;
    directOutgoingCount: number;
    totalIncomingCount: number;
    totalOutgoingCount: number;
    incomingLabelCounts: Record<string, number>;
    outgoingLabelCounts: Record<string, number>;
};

export type TaskLink = {
    id: string;
    projectId: string;
    sourceTaskId: string;
    targetTaskId: string;
    label: string;
    createdBy: string;
    createdAt: Date;
};

export interface CreateTaskParam {
    userId: string;
    projectId: string;
    teamId?: string | null;
    memberId?: string | null;
    title: string;
    description?: string;
    status?: TaskStatus;
}

export interface CreateLinkParam {
    userId: string;
    projectId: string;
    sourceTaskId: string;
    targetTaskId: string;
    label: string;
}

export interface UpdateTaskParam {
    userId: string;
    taskId: string;
    title?: string;
    description?: string;
    status?: TaskStatus;
}

export interface PaginationParams {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}

export interface TaskConnection {
    tasks: ProjectTask[];
    nextCursor: string | null;
    prevCursor: string | null;
}

export interface LinkConnection {
    links: TaskLink[];
    nextCursor: string | null;
    prevCursor: string | null;
}

export interface GetTaskLinksParam {
    userId: string;
    projectId: string;
    taskId: string;
    direction: 'incoming' | 'outgoing';
}

export interface TaskService extends BaseService {
    createTask(data: CreateTaskParam): Promise<ProjectTask>;
    createLink(data: CreateLinkParam): Promise<TaskLink>;
    updateTask(data: UpdateTaskParam): Promise<ProjectTask>;
    deleteTask(userId: string, taskId: string): Promise<void>;
    deleteLink(userId: string, linkId: string): Promise<void>;

    // Read Operations
    getTasks(
        userId: string,
        projectId: string,
        params: PaginationParams,
    ): Promise<TaskConnection>;

    getTasksByIds(userId: string, ids: string[]): Promise<ProjectTask[]>;

    getTaskLinks(
        params: GetTaskLinksParam,
        pagination: PaginationParams,
    ): Promise<LinkConnection>;

    getProjectLinks(
        userId: string, 
        projectId: string,
        pagination: PaginationParams
    ): Promise<LinkConnection>;

    getTaskNeighbourhood(params: GetNeighbourhoodParam): Promise<TaskNeighbourhoodResult>;
}

// ─── Neighbourhood (Radial Graph View) ──────────────────────────────────────

export type NeighbourDirection = 'incoming' | 'outgoing' | 'both';

/** A single neighbour node as returned from the reachability query, before task hydration */
export interface NeighbourRecord {
    taskId: string;
    depth: number;
    direction: NeighbourDirection;
    task?: ProjectTask;
}

export interface TaskNeighbourhoodResult {
    /** Raw neighbour records — resolver hydrates task data via DataLoader */
    neighbours: NeighbourRecord[];
    /** Direct links between all nodes in {focusedTask} ∪ {neighbours} */
    edges: TaskLink[];
    nextCursor: string | null;
    prevCursor: string | null;
}

export interface GetNeighbourhoodParam {
    userId: string;
    projectId: string;
    taskId: string;
    maxDepth?: number;   // default 3, hard cap 5
    first?: number;
    last?: number;
    after?: string;
    before?: string;
}
