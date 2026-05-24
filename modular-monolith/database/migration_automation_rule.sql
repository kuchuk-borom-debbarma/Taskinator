CREATE TABLE IF NOT EXISTS task_automation_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Automation',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_sync BOOLEAN NOT NULL DEFAULT FALSE,
    trigger_type TEXT NOT NULL,
    trigger_value TEXT,
    condition_type TEXT NOT NULL,
    condition_value TEXT,
    action_type TEXT NOT NULL,
    action_value TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_project_trigger
    ON task_automation_rule(fk_project_id, trigger_type);
