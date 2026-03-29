import type {BaseService} from "../project";

export type TaskTrigger = {
    id: string;
    name: string;
    projectId: string;
    taskId: string;
    createdAt: Date;
    updatedAt: Date;
    taskType: string;
    taskData: any;
}

export interface TaskTriggerService extends BaseService {
    addTriggerToTask(data: {
        userId: string;
        projectId: string;
        taskId: string;
        triggerType: string;
        triggerData: string;
    }): Promise<void>;
}