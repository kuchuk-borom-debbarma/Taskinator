import type { BaseService } from '../project';

export type TaskTriggerType =
    | 'WEBHOOK'
    | 'BLOCK_PARENT_DONE'
    | 'NOTIFY_TASK';

export type TaskTrigger = {
    id: string;
    name: string;
    projectId: string;
    taskId: string;
    createdAt: Date;
    updatedAt: Date;
    triggerType: TaskTriggerType;
    triggerData: any;
};

export interface TaskTriggerService extends BaseService {
    addTriggerToTask(data: {
        userId: string;
        name: string;
        projectId: string;
        taskId: string;
        triggerType: TaskTriggerType;
        triggerData: any;
    }): Promise<TaskTrigger>;
    updateTrigger(data: {
        userId: string;
        triggerId: string;
        name?: string;
        triggerType?: TaskTriggerType;
        triggerData?: any;
    }): Promise<void>;
    getTriggersForTask(data: {
        taskId: string;
        cursor?: string;
        limit?: number;
    }): Promise<{ triggers: TaskTrigger[]; nextCursor: string | null }>;
    deleteTrigger(data: { userId: string; triggerId: string }): Promise<void>;
    getTriggersByTaskIds(taskIds: string[]): Promise<Map<string, TaskTrigger[]>>;
}
