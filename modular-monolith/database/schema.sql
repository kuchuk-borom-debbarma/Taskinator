-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Project Table
CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    fk_user_id TEXT NOT NULL,
    last_event_id UUID,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Member Table
CREATE TABLE project_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    fk_user_id TEXT NOT NULL,
    last_event_id UUID,
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
    last_event_id UUID,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Team Member Table
CREATE TABLE project_team_member (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    fk_team_id UUID NOT NULL,
    fk_user_id TEXT NOT NULL,
    last_event_id UUID,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fk_team_id, fk_user_id)
);

-- Project Task Table
CREATE TABLE project_task (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    fk_team_id UUID,
    fk_member_id TEXT, -- References user_id who is assigned
    fk_parent_task_id UUID,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'TODO',
    materialized_path TEXT NOT NULL DEFAULT '',
    last_event_id UUID,
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX idx_project_task_path ON project_task(materialized_path);
CREATE INDEX idx_project_task_project ON project_task(fk_project_id);


-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kafka_topic TEXT NOT NULL,
    kafka_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automations Engine Table
CREATE TABLE automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    actor_id TEXT NOT NULL,
    target_scope TEXT NOT NULL, -- 'TASK', 'PROJECT', 'TEAM'
    fk_task_id UUID,            -- Specific task this automation is pinned to (optional)
    fk_team_id UUID,            -- Specific team this automation is pinned to (optional)
    rules JSONB NOT NULL, -- Array of { conditions, actions }
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_automations_project ON automations(fk_project_id);
CREATE INDEX idx_automations_task ON automations(fk_task_id) WHERE fk_task_id IS NOT NULL;
CREATE INDEX idx_automations_team ON automations(fk_team_id) WHERE fk_team_id IS NOT NULL;

-- Task Relationships (Direct Adjacency)
CREATE TABLE task_link (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    from_task_id UUID NOT NULL,
    to_task_id UUID NOT NULL,
    link_type TEXT NOT NULL, -- Max 50 chars enforced in code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_link_project FOREIGN KEY (fk_project_id) REFERENCES project(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_link_from FOREIGN KEY (from_task_id) REFERENCES project_task(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_link_to FOREIGN KEY (to_task_id) REFERENCES project_task(id) ON DELETE CASCADE
);

-- Task Relationships Materialized (Path Closure)
-- Stores the transitive reachability and the "Story Chain"
CREATE TABLE task_link_materialized (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    origin_id UUID NOT NULL,
    terminal_id UUID NOT NULL,
    path_task_ids UUID[] NOT NULL,
    path_link_types TEXT[] NOT NULL,
    depth INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_path_project FOREIGN KEY (fk_project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_link_terminal ON task_link_materialized(terminal_id);
CREATE INDEX idx_task_link_origin ON task_link_materialized(origin_id);
CREATE INDEX idx_task_link_types ON task_link_materialized USING GIN (path_link_types);
CREATE INDEX idx_task_link_project_id ON task_link(fk_project_id);


