import type { BaseService } from './index.ts';
import type { PaginationParams as SharedPaginationParams } from '../../types/pagination.ts';

export type TaskStatus = string;

export type Task = {
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
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    directIncomingCount: number;
    directOutgoingCount: number;
    totalIncomingCount: number;
    totalOutgoingCount: number;
    incomingLabelCounts: Record<string, number>;
    outgoingLabelCounts: Record<string, number>;
    createdAtPrecision?: string;
};

export type TaskLink = {
    id: string;
    projectId: string;
    sourceTaskId: string;
    targetTaskId: string;
    label: string;
    createdBy: string;
    createdAt: Date;
    updatedBy?: string;
    updatedAt?: string;
};

export type PaginationParams = SharedPaginationParams & {
    teamId?: string;
    memberId?: string;
};

export interface TaskConnection {
    tasks: Task[];
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
    // Read Operations
    getTasks(
        userId: string,
        projectId: string | null,
        params: PaginationParams,
    ): Promise<TaskConnection>;

    /**
     * Unauthorized batch fetch for internal use.
     */
    getTasksByIds(ids: string[]): Promise<Task[]>;

    /**
     * Authorized batch fetch.
     */
    getTasksByActorIdAndIds(actorId: string, ids: string[]): Promise<Task[]>;

    getTaskLinks(
        params: GetTaskLinksParam,
        pagination: PaginationParams,
    ): Promise<LinkConnection>;

    getProjectLinks(
        userId: string,
        projectId: string,
        pagination: PaginationParams,
    ): Promise<LinkConnection>;

    getTaskNeighbourhood(
        params: GetNeighbourhoodParam,
    ): Promise<TaskNeighbourhoodResult>;

    // Write Operations
    createTask(param: {
        actorId: string;
        projectId: string;
        title: string;
        description?: string | null;
        status?: string | null;
    }): Promise<Task>;

    updateTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
        version: number;
        title?: string | null;
        description?: string | null;
        status?: string | null;
        teamId?: string | null;
        memberId?: string | null;
    }): Promise<Task>;

    deleteTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
    }): Promise<string>;

    createTaskLink(param: {
        actorId: string;
        projectId: string;
        sourceTaskId: string;
        targetTaskId: string;
        label: string;
    }): Promise<TaskLink>;

    deleteTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
    }): Promise<string>;

    updateTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
        sourceTaskId?: string | null;
        targetTaskId?: string | null;
        label?: string | null;
    }): Promise<TaskLink>;
}

// ─── Neighbourhood (Radial Graph View) ──────────────────────────────────────

export type NeighbourDirection = 'incoming' | 'outgoing' | 'both';

/** A single neighbour node as returned from the reachability query, before task hydration */
export interface NeighbourRecord {
    taskId: string;
    depth: number;
    direction: NeighbourDirection;
    task?: Task;
}

export interface TaskNeighbourhoodResult {
    /** Raw neighbour records — resolver hydrates task data via DataLoader */
    neighbours: NeighbourRecord[];
    /** Direct links between all nodes in {focusedTask} ∪ {neighbours} */
    edges: TaskLink[];
    nextCursor: string | null;
    prevCursor: string | null;
}

export interface GetNeighbourhoodParam extends SharedPaginationParams {
    userId: string;
    projectId: string;
    taskId: string;
    maxDepth?: number; // default 3, hard cap 5
}
