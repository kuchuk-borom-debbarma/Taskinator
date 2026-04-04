import type {
    TaskTrigger,
    TaskTriggerService,
    TaskTriggerType,
} from '../TaskTriggerService.ts';
import {
    getTaskTriggersByTaskId,
    insertTaskTrigger,
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

    async getTriggersForTask(data: { taskId: string }): Promise<TaskTrigger[]> {
        return await getTaskTriggersByTaskId(data);
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
