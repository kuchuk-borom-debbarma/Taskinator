import { logger } from '../../../logger';
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
        logger.debug(
            `TaskService.getTasks called for user: ${userId}, project: ${projectId}`,
        );
        return getTasksPage(userId, projectId, params);
    }

    async getTasksByIds(ids: string[]): Promise<Task[]> {
        logger.debug(`TaskService.getTasksByIds called for ${ids.length} ids`);
        return await getTasksByIdsQuery(ids);
    }

    async getTasksByActorIdAndIds(
        actorId: string,
        ids: string[],
    ): Promise<Task[]> {
        logger.debug(
            `TaskService.getTasksByActorIdAndIds called for actor: ${actorId}, tasks: ${ids.length}`,
        );
        return await getTasksByActorIdAndIds(actorId, ids);
    }

    async getTaskLinks(
        params: GetTaskLinksParam,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        logger.debug(
            `TaskService.getTaskLinks called for task: ${params.taskId}, direction: ${params.direction}`,
        );
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
        logger.debug(
            `TaskService.getTaskNeighbourhood called for task: ${params.taskId}`,
        );
        return await getNeighbourhood(params);
    }

    async createTask(param: {
        actorId: string;
        projectId: string;
        title: string;
        description?: string | null;
        status?: string | null;
    }): Promise<Task> {
        logger.info(
            `TaskService.createTask started by ${param.actorId} in project ${param.projectId} for "${param.title}"`,
        );
        const result = await insertTask(param);
        logger.info(`TaskService.createTask successful: ${result.id}`);
        return result;
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
        logger.info(
            `TaskService.updateTask started for ${param.taskId} by ${param.actorId}`,
        );
        const result = await updateTask(param);
        logger.info(`TaskService.updateTask successful: ${param.taskId}`);
        return result;
    }

    async deleteTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
    }): Promise<string> {
        logger.info(
            `TaskService.deleteTask started for ${param.taskId} by ${param.actorId}`,
        );
        const result = await deleteTask(param);
        logger.info(`TaskService.deleteTask successful: ${param.taskId}`);
        return result;
    }

    async createTaskLink(param: {
        actorId: string;
        projectId: string;
        sourceTaskId: string;
        targetTaskId: string;
        label: string;
    }): Promise<TaskLink> {
        logger.info(
            `TaskService.createTaskLink started by ${param.actorId} between ${param.sourceTaskId} and ${param.targetTaskId}`,
        );
        const result = await insertTaskLink(param);
        logger.info(`TaskService.createTaskLink successful: ${result.id}`);
        return result;
    }

    async deleteTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
    }): Promise<string> {
        logger.info(
            `TaskService.deleteTaskLink started for ${param.linkId} by ${param.actorId}`,
        );
        const result = await deleteTaskLink(param);
        logger.info(`TaskService.deleteTaskLink successful: ${param.linkId}`);
        return result;
    }

    async updateTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
        sourceTaskId?: string | null;
        targetTaskId?: string | null;
        label?: string | null;
    }): Promise<TaskLink> {
        logger.info(
            `TaskService.updateTaskLink started for ${param.linkId} by ${param.actorId}`,
        );
        const result = await updateTaskLink(param);
        logger.info(`TaskService.updateTaskLink successful: ${param.linkId}`);
        return result;
    }

    async getProjectLinks(
        userId: string,
        projectId: string,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        logger.debug(
            `TaskService.getProjectLinks called for project: ${projectId}`,
        );
        return await getProjectTaskLinksPage(userId, projectId, pagination);
    }

    async init(): Promise<void> {
        logger.info(`TaskService initialized`);
    }

    async destroy(): Promise<void> {
        logger.info(`TaskService destroyed`);
    }
}
