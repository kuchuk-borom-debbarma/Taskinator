import type { BaseService } from '../project';

export type TaskTriggerType =
    | 'WEBHOOK'
    | 'BLOCK_PARENT_DONE'
    | 'NOTIFY_PARENT_TEAM'
    | 'NOTIFY_TASK_TEAM';

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
    }): Promise<void>;
    getTriggersForTask(data: {
        taskId: string;
        cursor?: string;
        limit?: number;
    }): Promise<{ triggers: TaskTrigger[]; nextCursor: string | null }>;
    deleteTrigger(data: { userId: string; triggerId: string }): Promise<void>;
}
