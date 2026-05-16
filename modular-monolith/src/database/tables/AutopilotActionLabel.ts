import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface ActionLabelTable {
    id: Generated<string>;
    name: string;
    action_hash: string;
    project_id: string;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
    created_by: string;
    updated_by: string;
}

export type ActionLabel = Selectable<ActionLabelTable>;
export type NewActionLabel = Insertable<ActionLabelTable>;
export type ActionLabelUpdate = Updateable<ActionLabelTable>;
