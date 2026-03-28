import type {BaseService} from "../project";

export type ProjectTask = {
    id: string;
    projectId: string;
    teamId: string | null;
    memberId: string | null;
    parentTaskId: string | null;
    title: string;
    description: string;
    status: string;
    materializedPath: string;
    version: number;
    lastEventId: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTaskParam {
    userId: string;
    projectId: string;
    title: string;
    description: string;
    teamId?: string;
    memberId?: string;
    parentTaskId?: string;
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
        status?: string;
        teamId?: string;
        memberId?: string;
        parentTaskId?: string;
    }[];
}

export interface TaskService extends BaseService {
    createTask(data: CreateTaskParam): Promise<ProjectTask>

    deleteTask(data: DeleteTasksParam): Promise<string[]>

    updateTasks(data: UpdateTasksParam): Promise<string[]>;

    getTasks(userId: string, projectId: string): Promise<ProjectTask[]>;
}
