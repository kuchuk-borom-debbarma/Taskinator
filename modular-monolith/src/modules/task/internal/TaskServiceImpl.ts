import type {
    CreateLinkParam,
    CreateTaskParam,
    ProjectTask,
    TaskLink,
    TaskService,
} from '../TaskService.ts';
import {
    deleteLinkQuery,
    deleteTaskQuery,
    insertLink,
    insertTask,
} from './TaskQueries.ts';

export class TaskServiceImpl implements TaskService {
    async createTask(data: CreateTaskParam): Promise<ProjectTask> {
        return await insertTask(data);
    }

    async createLink(data: CreateLinkParam): Promise<TaskLink> {
        return await insertLink(data);
    }

    async deleteTask(userId: string, taskId: string): Promise<void> {
        await deleteTaskQuery(userId, taskId);
    }

    async deleteLink(userId: string, linkId: string): Promise<void> {
        await deleteLinkQuery(userId, linkId);
    }

    async init(): Promise<void> {
        console.log(`[TaskService] Initializing...`);
    }

    async destroy(): Promise<void> {
        console.log(`[TaskService] Destroying...`);
    }
}
