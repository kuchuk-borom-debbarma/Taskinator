import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export interface AutomationsTable {
    id: Generated<string>;
    fk_project_id: string;
    actor_id: string;
    name: string;
    target_scope: string;
    fk_team_id: string | null;
    rules: any; //JSONB
    is_active: boolean;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, undefined>;
}

export type Automation = Selectable<AutomationsTable>;
export type NewAutomation = Insertable<AutomationsTable>;
export type AutomationUpdate = Updateable<AutomationsTable>;
