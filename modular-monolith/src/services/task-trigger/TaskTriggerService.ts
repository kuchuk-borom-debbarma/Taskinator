import type { BaseService } from '../project';

export type TaskTriggerType =
    | 'UPDATE_PARENT_STATUS'
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
    getTriggersForTask(data: { taskId: string }): Promise<TaskTrigger[]>;
}
