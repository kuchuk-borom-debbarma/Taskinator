import type {
    TaskTrigger,
    TaskTriggerService,
    TaskTriggerType,
} from '../TaskTriggerService.ts';
import {
    deleteTaskTrigger,
    getTaskTriggersByTaskId,
    getTriggersByTaskIds,
    insertTaskTrigger,
    updateTaskTrigger
} from './TaskTriggerQueries.ts';
import eventBus from '../../../utils/EventBus.ts';

export class TaskTriggerServiceImpl implements TaskTriggerService {
    async addTriggerToTask(data: {
        userId: string;
        name: string;
        projectId: string;
        taskId: string;
        triggerType: TaskTriggerType;
        triggerData: any;
    }): Promise<void> {
        await insertTaskTrigger(data);
    }

    async updateTrigger(data: {
        userId: string;
        triggerId: string;
        name?: string;
        triggerType?: TaskTriggerType;
        triggerData?: any;
    }): Promise<void> {
        await updateTaskTrigger(data);
    }

    async getTriggersForTask(data: {
        taskId: string;
        cursor?: string;
        limit?: number;
    }): Promise<{ triggers: TaskTrigger[]; nextCursor: string | null }> {
        return getTaskTriggersByTaskId(data);
    }

    async deleteTrigger(data: {
        userId: string;
        triggerId: string;
    }): Promise<void> {
        await deleteTaskTrigger(data);
    }

    async getTriggersByTaskIds(taskIds: string[]): Promise<Map<string, TaskTrigger[]>> {
        return getTriggersByTaskIds(taskIds);
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await eventBus.destroy();
    }

    async init(): Promise<void> {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
    }
}
