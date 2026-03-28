import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface ProjectTable {
    id: Generated<string>;
    name: string;
    description: string | null;
    fk_user_id: string;
    last_event_id: string | null;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}

// You should not use the table schema interfaces directly. Instead, you should
// use the `Selectable`, `Insertable` and `Updatable` wrappers. These wrappers
// make sure that the correct types are used in each operation.
//
// Most of the time you should trust the type inference and not use explicit
// types at all. These types can be useful when typing function arguments.
export type Project = Selectable<ProjectTable>;
export type NewProject = Insertable<ProjectTable>;
export type ProjectUpdate = Updateable<ProjectTable>;

export interface ProjectMemberTable {
    id: Generated<string>;
    fk_project_id: string;
    fk_user_id: string;
    last_event_id: string | null;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}

export type ProjectMember = Selectable<ProjectMemberTable>;
export type NewProjectMember = Insertable<ProjectMemberTable>;
export type ProjectMemberUpdate = Updateable<ProjectMemberTable>;

//TODO idempotent eventId key to prevent duplicate events.
