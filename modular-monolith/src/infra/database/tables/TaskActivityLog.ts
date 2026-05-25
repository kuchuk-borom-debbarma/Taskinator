import type { ColumnType, Generated, Insertable, Selectable } from 'kysely';

export interface TaskActivityLogTable {
    id: Generated<string>;
    fk_task_id: string;
    fk_project_id: string;
    fk_user_id: string;
    action_type: string;
    payload: ColumnType<
        Record<string, any>,
        Record<string, any> | string,
        Record<string, any> | string
    >;
    created_at: ColumnType<Date, string | undefined, never>;
}

export type TaskActivityLog = Selectable<TaskActivityLogTable>;
export type NewTaskActivityLog = Insertable<TaskActivityLogTable>;
