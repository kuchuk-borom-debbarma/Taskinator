import {db} from "../../../database";
import type {TaskTrigger} from "../TaskTriggerService.ts";

export const insertTaskTrigger = async (data: {
    userId: string;
    name: string;
    projectId: string;
    taskId: string;
    triggerType: string;
    triggerData: any;
}) => {
    //TODO define auth rules
    await db.insertInto('project_task_trigger_table')
        .values({
            fk_project_id: data.projectId,
            name: data.name,
            fk_task_id: data.taskId,
            trigger_data: data.triggerData,
            trigger_type: data.triggerType
        })
        .execute();
}

export const getTaskTriggersByTaskId = async (data: {
    taskId: string;
}): Promise<TaskTrigger[]> => {
    const {taskId} = data;
    //TODO auth and pagination
    return (await db.selectFrom('project_task_trigger_table')
        .selectAll()
        .where('fk_task_id', '=', taskId)
        .execute()).map(v=>({
            id: v.id,
            name: v.name,
            projectId: v.fk_project_id,
            taskId: v.fk_task_id,
            triggerType: v.trigger_type,
            triggerData: v.trigger_data,
            createdAt: v.created_at,
            updatedAt: v.updated_at
    }));
}