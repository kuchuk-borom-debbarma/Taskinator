import type {
    CreateLinkParam,
    CreateTaskParam,
    GetNeighbourhoodParam,
    GetTaskLinksParam,
    LinkConnection,
    PaginationParams,
    ProjectTask,
    TaskConnection,
    TaskLink,
    TaskNeighbourhoodResult,
    TaskService,
    UpdateTaskParam,
} from '../TaskService.ts';
import {
    deleteLinkQuery,
    deleteTaskQuery,
    getNeighbourhood,
    getProjectTaskLinksPage,
    getTaskLinksPage,
    getTasksByIds as getTasksByIdsQuery,
    getTasksPage,
    insertLink,
    insertTask,
    updateTaskQuery,
} from './TaskQueries.ts';

export class TaskServiceImpl implements TaskService {
    async createTask(data: CreateTaskParam): Promise<ProjectTask> {
        return await insertTask(data);
    }

    async createLink(data: CreateLinkParam): Promise<TaskLink> {
        return await insertLink(data);
    }

    async updateTask(data: UpdateTaskParam): Promise<ProjectTask> {
        return await updateTaskQuery(data);
    }

    async deleteTask(userId: string, taskId: string): Promise<void> {
        await deleteTaskQuery(userId, taskId);
    }

    async deleteLink(userId: string, linkId: string): Promise<void> {
        await deleteLinkQuery(userId, linkId);
    }

    async getTasks(
        userId: string,
        projectId: string | null,
        params: PaginationParams,
    ): Promise<TaskConnection> {
        return getTasksPage(userId, projectId || null, params);
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
