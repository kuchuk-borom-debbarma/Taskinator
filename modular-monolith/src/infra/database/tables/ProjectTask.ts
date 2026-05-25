import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface ProjectTaskTable {
    id: Generated<string>;
    fk_project_id: string;
    fk_team_id: string | null;
    fk_member_id: string | null;
    title: string;
    description: Generated<string>;
    status: Generated<string>;
    priority: Generated<number | null>;
    prev_status: string | null;
    prev_priority: number | null;
    prev_title: string | null;
    prev_team_id: string | null;
    prev_member_id: string | null;
    due_date: ColumnType<
        Date | null,
        string | Date | null | undefined,
        string | Date | null | undefined
    >;
    version: Generated<number>;
    created_by: string;
    updated_by: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
    direct_incoming_count: Generated<number>;
    direct_outgoing_count: Generated<number>;
    total_incoming_count: Generated<number>;
    total_outgoing_count: Generated<number>;
    incoming_label_counts: Generated<Record<string, number>>;
    outgoing_label_counts: Generated<Record<string, number>>;
}

export type ProjectTask = Selectable<ProjectTaskTable>;
export type NewProjectTask = Insertable<ProjectTaskTable>;
export type ProjectTaskUpdate = Updateable<ProjectTaskTable>;
