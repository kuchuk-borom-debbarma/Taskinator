import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface AutopilotExecutionTable {
    id: Generated<string>;
    fk_autopilot_id: string;
    fk_target_id: string;
    trace_id: string;
    trigger_event: string;
    status: string; // STARTED, MATCHED, SKIPPED, COMPLETED, FAILED
    created_at: Generated<Date>;
}

export type AutopilotExecution = Selectable<AutopilotExecutionTable>;
export type NewAutopilotExecution = Insertable<AutopilotExecutionTable>;
export type AutopilotExecutionUpdate = Updateable<AutopilotExecutionTable>;

export interface AutopilotStepLogTable {
    id: Generated<string>;
    fk_execution_id: string;
    action_type: string;
    status: string; // SUCCESS, FAILURE
    error_message: string | null;
    position: number;
    created_at: Generated<Date>;
}

export type AutopilotStepLog = Selectable<AutopilotStepLogTable>;
export type NewAutopilotStepLog = Insertable<AutopilotStepLogTable>;
