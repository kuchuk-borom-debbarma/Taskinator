-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Project Table
CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    fk_user_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    members_count INTEGER NOT NULL DEFAULT 0,
    tasks_count INTEGER NOT NULL DEFAULT 0,
    teams_count INTEGER NOT NULL DEFAULT 0
);

-- Project Member Table
CREATE TABLE project_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    fk_user_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fk_project_id, fk_user_id)
);

-- Project Team Table
CREATE TABLE project_team (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    fk_project_id UUID NOT NULL,
    fk_user_id TEXT NOT NULL, -- Creator
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    members_count INTEGER NOT NULL DEFAULT 0,
    tasks_count INTEGER NOT NULL DEFAULT 0
);

-- Project Team Member Table
CREATE TABLE project_team_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    fk_team_id UUID NOT NULL,
    fk_user_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fk_team_id, fk_user_id)
);

-- Task (Node) Table
CREATE TABLE project_task (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    fk_team_id UUID,
    fk_member_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'TODO',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    direct_incoming_count INTEGER NOT NULL DEFAULT 0,
    direct_outgoing_count INTEGER NOT NULL DEFAULT 0,
    total_incoming_count INTEGER NOT NULL DEFAULT 0,
    total_outgoing_count INTEGER NOT NULL DEFAULT 0,
    incoming_label_counts JSONB NOT NULL DEFAULT '{}',
    outgoing_label_counts JSONB NOT NULL DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 0,
    prev_status TEXT,
    prev_priority INTEGER,
    prev_title TEXT,
    prev_team_id UUID,
    prev_member_id TEXT,
    CONSTRAINT fk_task_project_id CHECK (fk_project_id IS NOT NULL)
);

-- Task Link (Direct Edge) Table
CREATE TABLE task_link (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    source_task_id UUID NOT NULL,
    target_task_id UUID NOT NULL,
    label TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_link_not_self CHECK (source_task_id <> target_task_id),
    CONSTRAINT chk_task_link_label_valid CHECK (length(trim(label)) BETWEEN 1 AND 50),
    CONSTRAINT uq_task_link_source_target UNIQUE (source_task_id, target_task_id)
);

-- Task Reachability (Transitive Index) Table
CREATE TABLE task_reachability (
    fk_project_id UUID NOT NULL,
    ancestor_task_id UUID NOT NULL,
    descendant_task_id UUID NOT NULL,
    depth INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fk_project_id, ancestor_task_id, descendant_task_id)
);

-- Performance Indexes for Task Graph
CREATE INDEX idx_project_task_project ON project_task(fk_project_id);
CREATE INDEX idx_task_link_source ON task_link(fk_project_id, source_task_id);
CREATE INDEX idx_task_link_target ON task_link(fk_project_id, target_task_id);
CREATE INDEX idx_task_link_pair ON task_link(fk_project_id, source_task_id, target_task_id);
CREATE INDEX idx_reach_desc ON task_reachability(fk_project_id, descendant_task_id, depth);
CREATE INDEX idx_reach_anc ON task_reachability(fk_project_id, ancestor_task_id, depth);



-- Idempotency Table
CREATE TABLE processed_event (
    event_id UUID NOT NULL,
    consumer_group TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, consumer_group)
);

-- Indexes for performance (10k RPS optimization)
CREATE INDEX idx_project_user ON project(fk_user_id);
CREATE INDEX idx_project_member_user ON project_member(fk_user_id);


-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    projects_count INTEGER NOT NULL DEFAULT 0
);

-- Pending Users Table
CREATE TABLE pending_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Internal Notifications Table (Bucket-per-User)
CREATE TABLE internal_notification (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    fk_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Initial Partition (for current data)
CREATE TABLE internal_notification_y2026 PARTITION OF internal_notification
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Indexes for 10k RPS
CREATE INDEX idx_internal_notification_user_unread ON internal_notification(fk_user_id) WHERE is_read = FALSE;
CREATE INDEX idx_internal_notification_user_feed ON internal_notification(fk_user_id, created_at DESC);

-- Outbox Events Table (wCTE Delivery)
CREATE TABLE outbox_events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    stream TEXT NOT NULL,
    stream_key TEXT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index to optimize recovery of orphaned locks under crash-recovery scenarios
CREATE INDEX idx_outbox_events_recovery ON outbox_events (status, locked_at) 
WHERE status = 'PROCESSING';


-- Trigger for Outbox Relay (LISTEN/NOTIFY)
CREATE OR REPLACE FUNCTION notify_outbox_event() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('outbox_event_notification', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Outbox Relay Trigger (End of file)
CREATE TRIGGER trg_outbox_event_inserted
AFTER INSERT ON outbox_events
FOR EACH ROW EXECUTE FUNCTION notify_outbox_event();




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
