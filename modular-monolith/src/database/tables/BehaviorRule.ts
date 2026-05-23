import type {
    ColumnType,
    Generated,
    Insertable,
    Selectable,
    Updateable,
} from 'kysely';

export type BehaviorType =
    | 'BLOCKER_RESOLUTION'
    | 'PARENT_DELETE_GUARD'
    | 'PRIORITY_CASCADE'
    | 'TEAM_CASCADE'
    | 'BLOCKER_SAFETY_GUARD'
    | 'MEMBER_ASSIGNMENT_GUARD'
    | 'CASCADE_DELETE'
    | 'AUTO_NOTIFY';

export type CriteriaOperator =
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'GREATER_THAN'
    | 'LESS_THAN';

export interface BehaviorRuleTable {
    id: Generated<string>;
    fk_project_id: string;
    name: string;
    is_active: Generated<boolean>;
    behavior_type: BehaviorType;
    fk_task_id: string | null;
    criteria_field: string | null;
    criteria_operator: CriteriaOperator | null;
    criteria_value: string | null;
    action_message: string | null;
    action_value: string | null;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type BehaviorRule = Selectable<BehaviorRuleTable>;
export type NewBehaviorRule = Insertable<BehaviorRuleTable>;
export type BehaviorRuleUpdate = Updateable<BehaviorRuleTable>;
