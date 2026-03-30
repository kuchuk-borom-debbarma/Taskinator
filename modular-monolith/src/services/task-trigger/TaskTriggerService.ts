import type {BaseService} from '../project';

export type TaskTrigger = {
    id: string;
    name: string;
    projectId: string;
    taskId: string;
    createdAt: Date;
    updatedAt: Date;
    triggerType: string;
    triggerData: any;
};

export interface TaskTriggerService extends BaseService {
    addTriggerToTask(data: {
        userId: string;
        name: string;
        projectId: string;
        taskId: string;
        triggerType: string;
        triggerData: any;
    }): Promise<void>;
    getTriggersForTask(data: {
        taskId: string;
    }): Promise<TaskTrigger[]>;
}
