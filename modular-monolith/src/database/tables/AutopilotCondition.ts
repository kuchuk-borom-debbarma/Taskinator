import type {
    ColumnType,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely';

export interface ConditionTable {
    id: string; // structural hash
    name: string;
    definition: JSONColumnType<any>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
    created_by: string;
}

export type Condition = Selectable<ConditionTable>;
export type NewCondition = Insertable<ConditionTable>;
export type ConditionUpdate = Updateable<ConditionTable>;
