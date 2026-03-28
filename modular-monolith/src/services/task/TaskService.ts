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
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskService extends BaseService {
    createTask(data: {
        userId: string;
        projectId: string;
        title: string;
        description: string;
        teamId?: string;
        memberId?: string;
        parentTaskId?: string;
        initialStatus: string;
    }): Promise<ProjectTask[]>

    deleteTask(data: {
        userId: string;
        projectId: string;
        taskIds: string[];
    }): Promise<string[]>

    updateTasks(data: {
        userId: string;
        projectId: string;
        tasks: {
            id: string;
            status?: string;
            teamId?: string;
            memberId?: string;
            parentTaskId?: string;
        }[]
    }): Promise<string[]>;
}