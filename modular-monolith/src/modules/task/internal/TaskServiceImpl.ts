import type {
    GetNeighbourhoodParam,
    GetTaskLinksParam,
    LinkConnection,
    PaginationParams,
    Task,
    TaskConnection,
    TaskNeighbourhoodResult,
    TaskService,
} from '../TaskService.ts';
import {
    getNeighbourhood,
    getProjectTaskLinksPage,
    getTaskLinksPage,
    getTasksByIds as getTasksByIdsQuery,
    getTasksPage,
} from './TaskQueries.ts';

export class TaskServiceImpl implements TaskService {
    async getTasks(
        userId: string,
        projectId: string | null,
        params: PaginationParams,
    ): Promise<TaskConnection> {
        return getTasksPage(userId, projectId, params);
    }

    async getTasksByIds(userId: string, ids: string[]): Promise<Task[]> {
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

    async getTaskNeighbourhood(
        params: GetNeighbourhoodParam,
    ): Promise<TaskNeighbourhoodResult> {
        return await getNeighbourhood(params);
    }

    async getProjectLinks(
        userId: string,
        projectId: string,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        return await getProjectTaskLinksPage(userId, projectId, pagination);
    }

    async init(): Promise<void> {
        console.log(`[TaskService] Initializing...`);
    }

    async destroy(): Promise<void> {
        console.log(`[TaskService] Destroying...`);
    }
}
