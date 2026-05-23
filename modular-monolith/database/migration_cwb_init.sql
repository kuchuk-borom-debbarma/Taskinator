-- Migration: CWB Engine Initialization
-- Description: Create behavior_rule table and wipe legacy auto_action data.
-- Strategy: Fresh Start (Wipe data, keep schema for compatibility).

CREATE TABLE IF NOT EXISTS behavior_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    behavior_type TEXT NOT NULL, -- e.g. 'BLOCKER_RESOLUTION', 'PARENT_DELETE_GUARD'
    
    fk_task_id UUID REFERENCES project_task(id) ON DELETE CASCADE,
    
    criteria_field TEXT,
    criteria_operator TEXT, -- 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN'
    criteria_value TEXT,
    
    action_message TEXT,
    action_value TEXT,
    
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_behavior_rule_project ON behavior_rule(fk_project_id);
CREATE INDEX IF NOT EXISTS idx_behavior_rule_task ON behavior_rule(fk_task_id) WHERE fk_task_id IS NOT NULL;

-- Wipe legacy auto_action data
TRUNCATE TABLE auto_action CASCADE;
