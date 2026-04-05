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
    async getTasks(userId: string, projectId: string): Promise<ProjectTask[]> {
        return getTasks(userId, projectId);
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

        await eventBus.publish(KAFKA_EVENTS.PROJECT_TASK.CREATED, {
            key: task.id,
            data: {
                taskId: task.id,
                projectId: task.projectId,
                userId: data.userId,
                title: task.title,
            },
        });

        return task;
    }

    async deleteTask(data: DeleteTasksParam): Promise<string[]> {
        const deletedTasks = await deleteTasks(data);

        for (const task of deletedTasks) {
            await eventBus.publish(KAFKA_EVENTS.PROJECT_TASK.PARENT_DELETED, {
                key: task.id,
                data: task,
            });
        }

        return deletedTasks.map(t => t.id);
    }

    async updateTasks(data: UpdateTasksParam): Promise<string[]> {
        const updatedIds: string[] = [];
        const payloads: any[] = [];

        for (const taskUpdate of data.tasks) {
            const result = await updateTask({
                userId: data.userId,
                projectId: data.projectId,
                taskId: taskUpdate.id,
                version: taskUpdate.version,
                lastEventId: taskUpdate.lastEventId,
                status: taskUpdate.status,
                teamId: taskUpdate.teamId,
                memberId: taskUpdate.memberId,
                parentTaskId: taskUpdate.parentTaskId,
            });

            if (result) {
                updatedIds.push(result);

                payloads.push({
                    key: result,
                    data: {
                        taskId: result,
                        projectId: data.projectId,
                        userId: data.userId,
                        updates: taskUpdate,
                    },
                });
            }
        }

        if (updatedIds.length !== data.tasks.length) {
            throw new Error(
                'Unauthorized, some tasks not found, or version conflict',
            );
        }

        if (payloads.length > 0) {
            await eventBus.publish(KAFKA_EVENTS.PROJECT_TASK.UPDATED, payloads);
        }

        return updatedIds;
    }
}
