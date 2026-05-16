import type {
    ColumnType,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely';

export interface ActionDefTable {
    id: string; // structural hash
    name: string;
    steps: JSONColumnType<any>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
    created_by: string;
}

export type ActionDef = Selectable<ActionDefTable>;
export type NewActionDef = Insertable<ActionDefTable>;
export type ActionDefUpdate = Updateable<ActionDefTable>;
