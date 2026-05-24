import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface TaskLinkTable {
    id: Generated<string>;
    fk_project_id: string;
    source_task_id: string;
    target_task_id: string;
    label: string;
    created_by: string;
    created_at: ColumnType<Date, string | undefined, never>;
}

export type TaskLink = Selectable<TaskLinkTable>;
export type NewTaskLink = Insertable<TaskLinkTable>;
export type TaskLinkUpdate = Updateable<TaskLinkTable>;
