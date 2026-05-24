import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface TaskAutomationRuleTable {
    id: Generated<string>;
    fk_project_id: string;
    name: Generated<string>;
    is_active: Generated<boolean>;
    is_sync: Generated<boolean>;
    trigger_type: string;
    trigger_value: string | null;
    condition_type: string;
    condition_value: string | null;
    action_type: string;
    action_value: string | null;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type TaskAutomationRule = Selectable<TaskAutomationRuleTable>;
export type NewTaskAutomationRule = Insertable<TaskAutomationRuleTable>;
export type TaskAutomationRuleUpdate = Updateable<TaskAutomationRuleTable>;
