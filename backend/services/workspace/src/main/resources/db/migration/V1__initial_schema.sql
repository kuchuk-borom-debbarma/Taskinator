-- V1__initial_schema.sql
-- Taskinator Workspace Service Initial Schema

-- PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    project_name VARCHAR(155) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    fk_owner_id UUID NOT NULL,
    members_count INTEGER NOT NULL DEFAULT 0,
    teams_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE
);

CREATE INDEX idx_projects_owner_id ON projects(fk_owner_id);
CREATE UNIQUE INDEX idx_projects_owner_name ON projects(fk_owner_id, project_name);

-- PROJECT MEMBERS
CREATE TABLE project_members (
    id UUID PRIMARY KEY,
    fk_project_id UUID NOT NULL,
    fk_owner_id UUID NOT NULL,
    fk_member_id UUID NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(511),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_members_project_id ON project_members(fk_project_id);
CREATE INDEX idx_members_owner_id ON project_members(fk_owner_id);
CREATE INDEX idx_members_user_id ON project_members(fk_member_id);
CREATE UNIQUE INDEX idx_members_project_user ON project_members(fk_project_id, fk_member_id);

-- PROJECT TEAMS
CREATE TABLE project_teams (
    id UUID PRIMARY KEY,
    fk_project_id UUID NOT NULL,
    fk_parent_team_id UUID,
    team_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE
);

CREATE INDEX idx_teams_project_id ON project_teams(fk_project_id);
CREATE INDEX idx_teams_parent_id ON project_teams(fk_parent_team_id);
CREATE UNIQUE INDEX idx_teams_project_name ON project_teams(fk_project_id, team_name);

-- PROJECT TEAM MEMBERS
CREATE TABLE project_team_members (
    id UUID PRIMARY KEY,
    fk_project_id UUID NOT NULL,
    fk_team_id UUID NOT NULL,
    fk_member_id UUID NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(511),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_team_members_project_id ON project_team_members(fk_project_id);
CREATE INDEX idx_team_members_team_id ON project_team_members(fk_team_id);
CREATE INDEX idx_team_members_user_id ON project_team_members(fk_member_id);
CREATE UNIQUE INDEX idx_team_members_proj_team_user ON project_team_members(fk_project_id, fk_team_id, fk_member_id);

-- PROJECT TEAM CLOSURE (For Infinite Hierarchy Management)
CREATE TABLE project_team_closure (
    id UUID PRIMARY KEY,
    fk_project_id UUID NOT NULL,
    fk_team_id UUID NOT NULL,
    fk_child_id UUID NOT NULL,
    depth INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_closure_project_id ON project_team_closure(fk_project_id);
CREATE INDEX idx_closure_team_id ON project_team_closure(fk_team_id);
CREATE INDEX idx_closure_child_id ON project_team_closure(fk_child_id);
CREATE UNIQUE INDEX idx_closure_proj_team_child ON project_team_closure(fk_project_id, fk_team_id, fk_child_id);

-- PROJECT TASKS
CREATE TABLE project_tasks (
    id UUID PRIMARY KEY,
    fk_project_id UUID NOT NULL,
    fk_parent_task_id UUID,
    fk_root_id UUID,
    path TEXT NOT NULL,
    fk_created_by UUID NOT NULL,
    fk_assigned_team UUID,
    fk_assigned_team_member UUID,
    title VARCHAR(155) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'NOT STARTED',
    lexo_rank VARCHAR(255) NOT NULL DEFAULT '0|hzzzzz:',
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_tasks_project_id ON project_tasks(fk_project_id);
CREATE INDEX idx_tasks_parent_id ON project_tasks(fk_parent_task_id);
CREATE INDEX idx_tasks_root_id ON project_tasks(fk_root_id);
CREATE INDEX idx_tasks_path ON project_tasks(path);
CREATE INDEX idx_tasks_team_id ON project_tasks(fk_assigned_team);
CREATE INDEX idx_tasks_member_id ON project_tasks(fk_assigned_team_member);
CREATE INDEX idx_tasks_proj_status_rank ON project_tasks(fk_project_id, status, lexo_rank);
