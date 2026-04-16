import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
    TaskLink,
    TaskLinkMaterialized,
    TaskService,
    UpdateTasksParam,
} from '../TaskService.ts';
import eventBus, { KAFKA_EVENTS } from '../../../utils/EventBus.ts';
import {
    deleteTasks,
    getTasks,
    insertTask,
    updateTask,
    createTaskLinkQuery,
    deleteTaskLinkQuery,
    getLinksQuery,
    getLinksByTaskIdsQuery,
    getTasksByIdsQuery,
    getTaskNetworkQuery,
} from './TaskQueries';
import { taskDeleteListener } from './listeners/TaskDeleteListener.ts';
import { linkPropagationListener } from './listeners/LinkPropagationListener.ts';
import { projectDeletedListener } from './listeners/ProjectDeletedListener.ts';
import { projectMemberDeletedListener } from './listeners/ProjectMemberDeletedListener.ts';
import { projectTeamDeletedListener } from './listeners/ProjectTeamDeletedListener.ts';
import { projectTeamMemberDeletedListener } from './listeners/ProjectTeamMemberDeletedListener.ts';

export class TaskServiceImpl implements TaskService {
    async getTasks(
        userId: string,
        projectId: string,
        params?: { after?: string; before?: string; limit?: number },
    ): Promise<{
        tasks: ProjectTask[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return getTasks(userId, projectId, params);
    }


    async init(): Promise<void> {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
        await Promise.all([
            taskDeleteListener.init(),
            linkPropagationListener.init(),
            projectDeletedListener.init(),
            projectMemberDeletedListener.init(),
            projectTeamDeletedListener.init(),
            projectTeamMemberDeletedListener.init(),
        ]);
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await eventBus.destroy();
    }

    async createTask(data: CreateTaskParam): Promise<ProjectTask> {
        const task = await insertTask(data);
        return task;
    }

    async deleteTask(data: DeleteTasksParam): Promise<string[]> {
        const deletedTasks = await deleteTasks(data);
        return deletedTasks.map((t) => t.id);
    }

    async updateTasks(data: UpdateTasksParam): Promise<string[]> {
        const updatePromises = data.tasks.map((taskUpdate) =>
            updateTask({
                userId: data.userId,
                projectId: data.projectId,
                taskId: taskUpdate.id,
                version: taskUpdate.version,
                lastEventId: taskUpdate.lastEventId,
                status: taskUpdate.status,
                title: taskUpdate.title,
                description: taskUpdate.description,
                teamId: taskUpdate.teamId,
                memberId: taskUpdate.memberId,
            }),
        );

        const results = await Promise.all(updatePromises);
        const updatedIds: string[] = results.filter(
            (r): r is string => r !== null,
        );

        if (updatedIds.length !== data.tasks.length) {
            throw new Error(
                'Unauthorized, some tasks not found, or version conflict',
            );
        }

        return updatedIds;
    }

    async createLink(data: {
        userId: string;
        projectId: string;
        sourceTaskId: string;
        targetTaskId: string;
        label: string;
    }): Promise<string> {
        return createTaskLinkQuery(data);
    }

    async deleteLink(data: {
        userId: string;
        projectId: string;
        linkId: string;
    }): Promise<void> {
        return deleteTaskLinkQuery(data);
    }

    async getLinks(
        userId: string,
        projectId: string,
        taskId: string,
    ): Promise<{
        direct: any[];
        story: any[];
    }> {
        return getLinksQuery({ userId, projectId, taskId });
    }

    async getLinksByTaskIds(
        projectId: string,
        taskIds: string[],
    ): Promise<
        Map<string, { direct: TaskLink[]; story: TaskLinkMaterialized[] }>
    > {
        return getLinksByTaskIdsQuery(projectId, taskIds);
    }

    async getTasksByIds(
        projectId: string,
        taskIds: string[],
    ): Promise<ProjectTask[]> {
        return getTasksByIdsQuery(projectId, taskIds);
    }

    async getTaskNetwork(data: {
        userId: string;
        projectId: string;
        taskId: string;
        depth?: number;
        limit?: number;
    }) {
        return getTaskNetworkQuery(data);
    }
}
