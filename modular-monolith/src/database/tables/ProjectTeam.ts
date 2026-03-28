import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface ProjectTeamTable {
    id: Generated<string>;
    name: string;
    fk_project_id: string;
    fk_user_id: string; //The user who created this team
    last_event_id: string | null;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}

export type ProjectTeam = Selectable<ProjectTeamTable>;
export type NewProjectTeam = Insertable<ProjectTeamTable>;
export type ProjectTeamUpdate = Updateable<ProjectTeamTable>;

export interface ProjectTeamMemberTable {
    id: Generated<string>;
    fk_project_id: string;
    fk_user_id: string;
    fk_team_id: string;
    last_event_id: string | null;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}

export type ProjectTeamMember = Selectable<ProjectTeamMemberTable>;
export type NewProjectTeamMember = Insertable<ProjectTeamMemberTable>;
export type ProjectTeamMemberUpdate = Updateable<ProjectTeamMemberTable>;
