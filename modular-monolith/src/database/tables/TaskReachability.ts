import type { ColumnType, Generated, Insertable, Selectable } from 'kysely';

export interface TaskReachabilityTable {
    fk_project_id: string;
    ancestor_task_id: string;
    descendant_task_id: string;
    min_depth: number;
    path_count: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
}

export type TaskReachability = Selectable<TaskReachabilityTable>;
export type NewTaskReachability = Insertable<TaskReachabilityTable>;
