import type {
    ColumnType,
    Generated,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely';

export interface AutoActionTable {
    id: Generated<string>;
    fk_project_id: string;
    name: Generated<string>;
    description: string | null;
    triggers: JSONColumnType<any[]>;
    steps: JSONColumnType<any[]>;
    is_active: Generated<boolean>;
    is_sync: Generated<boolean>;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
    created_by: string;
    updated_by: string;
}

export type AutoAction = Selectable<AutoActionTable>;
export type NewAutoAction = Insertable<AutoActionTable>;
export type AutoActionUpdate = Updateable<AutoActionTable>;
