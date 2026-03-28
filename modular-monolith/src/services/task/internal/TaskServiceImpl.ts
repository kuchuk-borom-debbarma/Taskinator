import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
    TaskService,
    UpdateTasksParam,
} from "../TaskService.ts";
import {buildKafkaMessage, KAFKA_EVENTS, KAFKA_TOPICS} from "../../../utils/kafka.ts";
import {deleteTasks, insertTask, updateTask} from "./TaskQueries.ts";
import {eventBus} from "../../../utils/EventBus.ts";

export class TaskServiceImpl implements TaskService {
    async init(): Promise<void> {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await eventBus.destroy();
    }

    async createTask(data: CreateTaskParam): Promise<ProjectTask[]> {
        const task = await insertTask(data);

        await eventBus.publish(
            KAFKA_TOPICS.PROJECT_TASK,
            buildKafkaMessage({
                key: task.id,
                type: KAFKA_EVENTS.PROJECT_TASK.CREATED,
                source: `${this.constructor.name}.createTask`,
                data: {
                    taskId: task.id,
                    projectId: task.projectId,
                    userId: data.userId,
                    title: task.title,
                },
            }),
        );

        return [task];
    }

    async deleteTask(data: DeleteTasksParam): Promise<string[]> {
        const deletedIds = await deleteTasks(data);

        const messages = deletedIds.map((taskId: string) =>
            buildKafkaMessage({
                key: taskId,
                type: KAFKA_EVENTS.PROJECT_TASK.DELETED,
                source: `${this.constructor.name}.deleteTask`,
                data: {
                    taskId,
                    projectId: data.projectId,
                    userId: data.userId,
                },
            }),
        );

        for (const msg of messages) {
            await eventBus.publish(KAFKA_TOPICS.PROJECT_TASK, msg);
        }

        return deletedIds;
    }

    async updateTasks(data: UpdateTasksParam): Promise<string[]> {
        const updatedIds: string[] = [];

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

                await eventBus.publish(
                    KAFKA_TOPICS.PROJECT_TASK,
                    buildKafkaMessage({
                        key: result,
                        type: KAFKA_EVENTS.PROJECT_TASK.UPDATED,
                        source: `${this.constructor.name}.updateTasks`,
                        data: {
                            taskId: result,
                            projectId: data.projectId,
                            userId: data.userId,
                            updates: taskUpdate,
                        },
                    }),
                );
            }
        }

        if (updatedIds.length !== data.tasks.length) {
            throw new Error('Unauthorized, some tasks not found, or version conflict');
        }

        return updatedIds;
    }
}
