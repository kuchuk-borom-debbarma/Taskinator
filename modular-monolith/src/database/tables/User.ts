import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface UserTable {
    id: Generated<string>;
    email: string;
    username: string;
    password_hash: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
    projects_count: number;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;

export interface PendingUserTable {
    id: Generated<string>;
    email: string;
    username: string;
    password_hash: string;
    created_at: ColumnType<Date, string | undefined, never>;
}

export type PendingUser = Selectable<PendingUserTable>;
export type NewPendingUser = Insertable<PendingUserTable>;
export type PendingUserUpdate = Updateable<PendingUserTable>;
