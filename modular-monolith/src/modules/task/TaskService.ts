import type { PaginationParams as SharedPaginationParams } from '../../infra/types/pagination.ts';
import type { DomainEvent } from '../../infra/utils/event-bus';
import type { BaseService } from './index.ts';

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
    createdBy: string;
    updatedBy: string;
    priority: number;
    dueDate: Date | null;
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

export type TaskAutomationRule = {
    id: string;
    projectId: string;
    name: string;
    isActive: boolean;
    isSync: boolean;
    triggerType: string;
    triggerValue: string | null;
    conditionType: string;
    conditionValue: string | null;
    actionType: string;
    actionValue: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
};

export type CreateTaskAutomationRuleInput = {
    projectId: string;
    name: string;
    isActive?: boolean | null;
    isSync?: boolean | null;
    triggerType: string;
    triggerValue?: string | null;
    conditionType: string;
    conditionValue?: string | null;
    actionType: string;
    actionValue?: string | null;
};

export type UpdateTaskAutomationRuleInput = {
    projectId: string;
    ruleId: string;
    version: number;
    name?: string | null;
    isActive?: boolean | null;
    isSync?: boolean | null;
    triggerType?: string | null;
    triggerValue?: string | null;
    conditionType?: string | null;
    conditionValue?: string | null;
    actionType?: string | null;
    actionValue?: string | null;
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
    search?: string | null;
    status?: string | null;
    priority?: number | null;
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

export type TaskReachabilityLinkChange = {
    action: 'ADD' | 'REMOVE';
    sourceTaskId: string;
    targetTaskId: string;
};

/**
 * Minimal task row used by the auto-action context resolver.
 * Internal-only — no actor permission check needed.
 */
export type TaskContextRow = {
    id: string;
    fk_project_id: string;
    fk_team_id: string | null;
    fk_member_id: string | null;
    title: string;
    status: string;
    priority: number | null;
    version: number;
    prev_status: string | null;
    prev_priority: number | null;
    prev_title: string | null;
    prev_team_id: string | null;
    prev_member_id: string | null;
};

export interface GetTaskLinksParam {
    userId: string;
    projectId: string;
    taskId: string;
    direction: 'incoming' | 'outgoing' | 'both';
    depthLimit?: number;
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

    /**
     * Internal fetch for auto-action context resolution.
     * No actor permission check — caller is trusted (auto-action engine).
     */
    getTaskContextById(taskId: string): Promise<TaskContextRow | undefined>;

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

    getAutomationRulesForProject(
        userId: string,
        projectId: string,
    ): Promise<TaskAutomationRule[]>;

    // Write Operations
    createTask(param: {
        actorId: string;
        projectId: string;
        title: string;
        description?: string | null;
        status?: string | null;
        priority?: number | null;
        dueDate?: string | null;
        traceId?: string | null;
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
        priority?: number | null;
        dueDate?: string | null;
        traceId?: string | null;
    }): Promise<Task>;

    createAutomationRule(
        actorId: string,
        input: CreateTaskAutomationRuleInput,
    ): Promise<TaskAutomationRule>;

    updateAutomationRule(
        actorId: string,
        input: UpdateTaskAutomationRuleInput,
    ): Promise<TaskAutomationRule>;

    deleteAutomationRule(
        actorId: string,
        projectId: string,
        ruleId: string,
    ): Promise<boolean>;

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

    handleTaskReachabilitySync(
        events: DomainEvent<{
            projectId: string;
            links: TaskReachabilityLinkChange[];
        }>[],
    ): Promise<void>;

    handleDeleteTaskLinks(
        events: DomainEvent<{ taskIds: string[] }>[],
    ): Promise<void>;

    handleDeleteTaskReachability(
        events: DomainEvent<{ taskIds: string[] }>[],
    ): Promise<void>;

    handleUnassignProjectTaskMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ): Promise<void>;

    handleDeleteProjectTask(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void>;

    handleDeleteProjectTaskLink(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void>;

    handleDeleteProjectReachability(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void>;

    handleOrphanTeamTasks(
        events: DomainEvent<{ teamIds: string[] }>[],
    ): Promise<void>;

    handleUnassignMemberFromTeamTasks(
        events: DomainEvent<{ teamId: string; userIds: string[] }>[],
    ): Promise<void>;
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
