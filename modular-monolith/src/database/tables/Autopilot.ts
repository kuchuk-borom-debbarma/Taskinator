import type {
    ColumnType,
    Generated,
    Insertable,
    JSONColumnType,
    Selectable,
    Updateable,
} from 'kysely';

export type ConditionNode =
    | { type: 'and'; children: ConditionNode[] }
    | { type: 'or'; children: ConditionNode[] }
    | { type: 'not'; child: ConditionNode }
    | {
          type: 'predicate';
          domain: string;
          field: string;
          operator: string;
          value: any;
      };

export type ConditionTree = ConditionNode;

export interface AutopilotTable {
    id: Generated<string>;
    fk_project_id: string;
    name: Generated<string>;
    description: string | null;
    triggers: JSONColumnType<any[]>;
    steps: JSONColumnType<any[]>;
    is_active: Generated<boolean>;
    trace_history_enabled: Generated<boolean>;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
    created_by: string;
    updated_by: string;
}

export type Autopilot = Selectable<AutopilotTable>;
export type NewAutopilot = Insertable<AutopilotTable>;
export type AutopilotUpdate = Updateable<AutopilotTable>;
