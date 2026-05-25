import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface TaskCommentTable {
    id: Generated<string>;
    fk_task_id: string;
    fk_project_id: string;
    fk_user_id: string;
    content: string;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type TaskComment = Selectable<TaskCommentTable>;
export type NewTaskComment = Insertable<TaskCommentTable>;
export type TaskCommentUpdate = Updateable<TaskCommentTable>;
