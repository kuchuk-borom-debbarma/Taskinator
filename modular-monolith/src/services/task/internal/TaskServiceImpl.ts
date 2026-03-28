import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
    TaskService,
    UpdateTasksParam,
} from "../TaskService.ts";
import {createEvent, KAFKA_EVENTS, KAFKA_TOPICS} from "../../../utils/kafka.ts";
import {deleteTasks, getTasks, insertTask, updateTask} from "./TaskQueries.ts";
import {eventBus} from "../../../utils/EventBus.ts";

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

        await eventBus.emit(
            KAFKA_TOPICS.PROJECT_TASK,
            createEvent(KAFKA_EVENTS.PROJECT_TASK.CREATED, task.id, {
                taskId: task.id,
                projectId: task.projectId,
                userId: data.userId,
                title: task.title,
            })
        );

        return task;
    }

    async deleteTask(data: DeleteTasksParam): Promise<string[]> {
        const deletedIds = await deleteTasks(data);

        const events = deletedIds.map((taskId: string) =>
            createEvent(KAFKA_EVENTS.PROJECT_TASK.DELETED, taskId, {
                taskId,
                projectId: data.projectId,
                userId: data.userId,
            })
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT_TASK, events);

        return deletedIds;
    }

    async updateTasks(data: UpdateTasksParam): Promise<string[]> {
        const updatedIds: string[] = [];
        const events: any[] = [];

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

                events.push(
                    createEvent(KAFKA_EVENTS.PROJECT_TASK.UPDATED, result, {
                        taskId: result,
                        projectId: data.projectId,
                        userId: data.userId,
                        updates: taskUpdate,
                    })
                );
            }
        }

        if (updatedIds.length !== data.tasks.length) {
            throw new Error('Unauthorized, some tasks not found, or version conflict');
        }

        if (events.length > 0) {
            await eventBus.emit(KAFKA_TOPICS.PROJECT_TASK, events);
        }

        return updatedIds;
    }
}
