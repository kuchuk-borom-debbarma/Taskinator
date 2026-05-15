import type {
    ColumnType,
    Generated,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely';

export interface AutopilotActionTable {
    id: Generated<string>;
    fk_autopilot_id: string;
    type: string; // e.g. 'task.update_status'
    config: JSONColumnType<Record<string, any>>;
    position: number;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type AutopilotAction = Selectable<AutopilotActionTable>;
export type NewAutopilotAction = Insertable<AutopilotActionTable>;
export type AutopilotActionUpdate = Updateable<AutopilotActionTable>;
