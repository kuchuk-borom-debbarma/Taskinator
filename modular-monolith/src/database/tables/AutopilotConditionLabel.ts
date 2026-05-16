import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface ConditionLabelTable {
    id: Generated<string>;
    name: string;
    condition_hash: string;
    project_id: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
    created_by: string;
    updated_by: string;
}

export type ConditionLabel = Selectable<ConditionLabelTable>;
export type NewConditionLabel = Insertable<ConditionLabelTable>;
export type ConditionLabelUpdate = Updateable<ConditionLabelTable>;
