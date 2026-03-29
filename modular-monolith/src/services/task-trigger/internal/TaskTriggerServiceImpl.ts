import type { TaskTriggerService } from '../TaskTriggerService.ts';

export class TaskTriggerServiceImpl implements TaskTriggerService {
    async addTriggerToTask(data: {
        userId: string;
        projectId: string;
        taskId: string;
        triggerType: string;
        triggerData: string;
    }): Promise<void> {
        return Promise.resolve();
    }

    destroy(): Promise<void> {
        return Promise.resolve(undefined);
    }

    init(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
