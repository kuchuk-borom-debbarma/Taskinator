import type { BaseService } from '../project';

export type ProjectTask = {
    id: string;
    projectId: string;
    teamId: string | null;
    memberId: string | null;
    title: string;
    description: string;
    status: string;
    version: number;
    lastEventId: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
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

export type TaskLinkMaterialized = {
    id: string;
    projectId: string;
    originTaskId: string;
    terminalTaskId: string;
    pathTaskIds: string[];
    pathLinkIds: string[];
    pathLinkLabels: string[];
    depth: number;
    createdAt: Date;
};

export type TaskNetwork = {
    incoming: TaskLinkMaterialized[];
    outgoing: TaskLinkMaterialized[];
};

export interface CreateTaskParam {
    userId: string;
    projectId: string;
    title: string;
    description: string;
    teamId?: string;
    memberId?: string;
    initialStatus: string;
}

export interface DeleteTasksParam {
    userId: string;
    projectId: string;
    taskIds: string[];
}

export interface UpdateTasksParam {
    userId: string;
    projectId: string;
    tasks: {
        id: string;
        version: number;
        lastEventId?: string;
        title?: string;
        description?: string;
        status?: string;
        teamId?: string;
        memberId?: string;
    }[];
}

export interface TaskService extends BaseService {
    createTask(data: CreateTaskParam): Promise<ProjectTask>;

    deleteTask(data: DeleteTasksParam): Promise<string[]>;

    updateTasks(data: UpdateTasksParam): Promise<string[]>;

    getTasks(
        userId: string,
        projectId: string,
        params?: { after?: string; before?: string; limit?: number },
    ): Promise<{
        tasks: ProjectTask[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;


    createLink(data: {
        userId: string;
        projectId: string;
        sourceTaskId: string;
        targetTaskId: string;
        label: string;
    }): Promise<string>;

    deleteLink(data: {
        userId: string;
        projectId: string;
        linkId: string;
    }): Promise<void>;

    getLinks(
        userId: string,
        projectId: string,
        taskId: string,
    ): Promise<{
        direct: TaskLink[];
        story: TaskLinkMaterialized[];
    }>;

    getLinksByTaskIds(
        projectId: string,
        taskIds: string[],
    ): Promise<
        Map<string, { direct: TaskLink[]; story: TaskLinkMaterialized[] }>
    >;

    getTasksByIds(
        projectId: string,
        taskIds: string[],
    ): Promise<ProjectTask[]>;

    getTaskNetwork(data: {
        userId: string;
        projectId: string;
        taskId: string;
        depth?: number;
        limit?: number;
    }): Promise<TaskNetwork>;
}
