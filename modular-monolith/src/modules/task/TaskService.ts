import type { BaseService } from './index.ts';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

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

export interface TaskService extends BaseService {
    createTask(data: CreateTaskParam): Promise<ProjectTask>;
    createLink(data: CreateLinkParam): Promise<TaskLink>;
    deleteTask(userId: string, taskId: string): Promise<void>;
    deleteLink(userId: string, linkId: string): Promise<void>;
}
