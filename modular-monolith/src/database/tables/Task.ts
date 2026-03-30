import type {ProjectTeamTable} from './ProjectTeam.ts';
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
    fk_parent_task_id: string | null;
    title: string;
    description: string;
    status: string;
    materialized_path: string;
    last_event_id: string | null;
    version: Generated<number>;
    created_by: string;
    updated_by: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}

export type ProjectTask = Selectable<ProjectTaskTable>;
export type NewProjectTask = Insertable<ProjectTaskTable>;
export type ProjectTaskUpdate = Updateable<ProjectTaskTable>;

export interface ProjectTaskTriggerTable {
    id: Generated<string>;
    name: string;
    fk_project_id: string;
    fk_task_id: string;
    trigger_type: string;
    trigger_data: any; //JSONB
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}
