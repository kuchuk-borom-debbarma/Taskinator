import type {
    CreateLinkParam,
    CreateTaskParam,
    GetTaskLinksParam,
    LinkConnection,
    PaginationParams,
    ProjectTask,
    TaskConnection,
    TaskLink,
    TaskService,
} from '../TaskService.ts';
import {
    deleteLinkQuery,
    deleteTaskQuery,
    getTaskLinksPage,
    getTasksByIds as getTasksByIdsQuery,
    getTasksPage,
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

    async getTasks(
        userId: string,
        projectId: string,
        params: PaginationParams,
    ): Promise<TaskConnection> {
        return await getTasksPage(userId, projectId, params);
    }

    async getTasksByIds(userId: string, ids: string[]): Promise<ProjectTask[]> {
        return await getTasksByIdsQuery(userId, ids);
    }

    async getTaskLinks(
        params: GetTaskLinksParam,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        return await getTaskLinksPage(
            params.userId,
            params.projectId,
            params.taskId,
            params.direction,
            pagination,
        );
    }

    async init(): Promise<void> {
        console.log(`[TaskService] Initializing...`);
    }

    async destroy(): Promise<void> {
        console.log(`[TaskService] Destroying...`);
    }
}
