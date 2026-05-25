-- Migration: Task Comments and Activity Logs (Mutation History)
-- Date: 2026-05-25

-- Create task comment table
CREATE TABLE IF NOT EXISTS task_comment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_task_id UUID NOT NULL REFERENCES project_task(id) ON DELETE CASCADE,
    fk_project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    fk_user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for Comments (High Throughput & Cursor Pagination)
CREATE INDEX IF NOT EXISTS idx_task_comment_task_created ON task_comment(fk_task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_comment_project ON task_comment(fk_project_id);

-- Create task activity log table (Mutation History)
CREATE TABLE IF NOT EXISTS task_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_task_id UUID NOT NULL REFERENCES project_task(id) ON DELETE CASCADE,
    fk_project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    fk_user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for Activity Log (High Throughput & Cursor Pagination)
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_created ON task_activity_log(fk_task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_project ON task_activity_log(fk_project_id);
