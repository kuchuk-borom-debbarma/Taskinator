import type { ProjectTeamTable } from './ProjectTeam.ts';
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
    description: string;
    status: string;
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

export interface AutomationsTable {
    id: Generated<string>;
    fk_project_id: string;
    actor_id: string;
    name: string;
    target_scope: string;
    fk_task_id: string | null;
    fk_team_id: string | null;
    rules: any; //JSONB
    is_active: boolean;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}

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

export interface TaskLinkMaterializedTable {
    id: Generated<string>;
    fk_project_id: string;
    origin_task_id: string;
    terminal_task_id: string;
    path_task_ids: string[];
    path_link_ids: string[];
    path_link_labels: string[];
    depth: number;
    created_at: ColumnType<Date, string | undefined, never>;
}

export type TaskLinkMaterialized = Selectable<TaskLinkMaterializedTable>;
