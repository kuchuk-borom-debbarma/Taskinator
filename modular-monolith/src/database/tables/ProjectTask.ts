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
    last_event_id: string | null;
    version: Generated<number>;
    created_by: string;
    updated_by: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type ProjectTask = Selectable<ProjectTaskTable>;
export type NewProjectTask = Insertable<ProjectTaskTable>;
export type ProjectTaskUpdate = Updateable<ProjectTaskTable>;
