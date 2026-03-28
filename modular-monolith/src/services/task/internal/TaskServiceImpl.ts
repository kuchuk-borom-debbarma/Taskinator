import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
    TaskService,
    UpdateTasksParam,
} from "../TaskService.ts";
import type {Producer} from "kafkajs";
import {kafka} from "../../../kafka";
import {buildKafkaMessage, KAFKA_EVENTS, KAFKA_TOPICS} from "../../../utils/kafka.ts";
import {deleteTasks, insertTask, updateTask} from "./TaskQueries.ts";

export class TaskServiceImpl implements TaskService {
    producer: Producer;

    constructor() {
        this.producer = kafka.producer({
            allowAutoTopicCreation: true,
            idempotent: true,
        });
    }

    async init(): Promise<void> {
        console.log(`Connecting producer ${this.constructor.name}`);
        await this.producer.connect();
        console.log(`Connected producer ${this.constructor.name}`);
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting kafka producer ${this.constructor.name}`);
        await this.producer.disconnect();
    }

    async createTask(data: CreateTaskParam): Promise<ProjectTask[]> {
        const task = await insertTask(data);

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_TASK,
            messages: [
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
            ],
        });

        return [task];
    }

    async deleteTask(data: DeleteTasksParam): Promise<string[]> {
        const deletedIds = await deleteTasks(data);

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_TASK,
            messages: deletedIds.map((taskId: string) =>
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
            ),
        });

        return deletedIds;
    }

    async updateTasks(data: UpdateTasksParam): Promise<string[]> {
        const updatedIds: string[] = [];

        for (const taskUpdate of data.tasks) {
            const result = await updateTask({
                userId: data.userId,
                projectId: data.projectId,
                taskId: taskUpdate.id,
                status: taskUpdate.status,
                teamId: taskUpdate.teamId,
                memberId: taskUpdate.memberId,
                parentTaskId: taskUpdate.parentTaskId,
            });

            if (result) {
                updatedIds.push(result);

                await this.producer.send({
                    topic: KAFKA_TOPICS.PROJECT_TASK,
                    messages: [
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
                    ],
                });
            }
        }

        if (updatedIds.length !== data.tasks.length) {
            throw new Error('Unauthorized or some tasks not found/invalid');
        }

        return updatedIds;
    }
}
