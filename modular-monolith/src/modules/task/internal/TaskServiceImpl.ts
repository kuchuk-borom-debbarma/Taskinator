import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
    TaskService,
    UpdateTasksParam,
} from '../TaskService.ts';
import eventBus, { KAFKA_EVENTS } from '../../../utils/EventBus.ts';
import {
    deleteTasks,
    getTasks,
    insertTask,
    updateTask,
} from './TaskQueries.ts';

export class TaskServiceImpl implements TaskService {
    async getTasks(
        userId: string,
        projectId: string,
        params?: { cursor?: string; limit?: number },
    ): Promise<{ tasks: ProjectTask[]; nextCursor: string | null }> {
        return getTasks(userId, projectId, params);
    }

    async init(): Promise<void> {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
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
        const updatePromises = data.tasks.map(taskUpdate =>
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
                parentTaskId: taskUpdate.parentTaskId,
            })
        );

        const results = await Promise.all(updatePromises);
        const updatedIds: string[] = results.filter((r): r is string => r !== null);

        if (updatedIds.length !== data.tasks.length) {
            throw new Error(
                'Unauthorized, some tasks not found, or version conflict',
            );
        }

        return updatedIds;
    }
}
