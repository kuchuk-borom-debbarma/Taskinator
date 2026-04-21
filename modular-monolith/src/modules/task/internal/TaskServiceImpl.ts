import type {
    GetNeighbourhoodParam,
    GetTaskLinksParam,
    LinkConnection,
    PaginationParams,
    Task,
    TaskConnection,
    TaskLink,
    TaskNeighbourhoodResult,
    TaskService,
} from '../TaskService.ts';
import {
    deleteTask,
    deleteTaskLink,
    getNeighbourhood,
    getProjectTaskLinksPage,
    getTaskLinksPage,
    getTasksByActorIdAndIds,
    getTasksByIds as getTasksByIdsQuery,
    getTasksPage,
    insertTask,
    insertTaskLink,
    updateTask,
    updateTaskLink,
} from './TaskQueries.ts';

export class TaskServiceImpl implements TaskService {
    async getTasks(
        userId: string,
        projectId: string | null,
        params: PaginationParams,
    ): Promise<TaskConnection> {
        return getTasksPage(userId, projectId, params);
    }

    async getTasksByIds(ids: string[]): Promise<Task[]> {
        return await getTasksByIdsQuery(ids);
    }

    async getTasksByActorIdAndIds(
        actorId: string,
        ids: string[],
    ): Promise<Task[]> {
        return await getTasksByActorIdAndIds(actorId, ids);
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

    async createTask(param: {
        actorId: string;
        projectId: string;
        title: string;
        description?: string | null;
        status?: string | null;
    }): Promise<Task> {
        return await insertTask(param);
    }

    async updateTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
        version: number;
        title?: string | null;
        description?: string | null;
        status?: string | null;
        teamId?: string | null;
        memberId?: string | null;
    }): Promise<Task> {
        return await updateTask(param);
    }

    async deleteTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
    }): Promise<string> {
        return await deleteTask(param);
    }

    async createTaskLink(param: {
        actorId: string;
        projectId: string;
        sourceTaskId: string;
        targetTaskId: string;
        label: string;
    }): Promise<TaskLink> {
        return await insertTaskLink(param);
    }

    async deleteTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
    }): Promise<string> {
        return await deleteTaskLink(param);
    }

    async updateTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
        sourceTaskId?: string | null;
        targetTaskId?: string | null;
        label?: string | null;
    }): Promise<TaskLink> {
        return await updateTaskLink(param);
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
