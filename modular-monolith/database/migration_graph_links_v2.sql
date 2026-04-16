DROP TABLE IF EXISTS task_link_materialized;
DROP TABLE IF EXISTS task_link;

CREATE TABLE task_link (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    source_task_id UUID NOT NULL,
    target_task_id UUID NOT NULL,
    label TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_link_project FOREIGN KEY (fk_project_id) REFERENCES project(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_link_source FOREIGN KEY (source_task_id) REFERENCES project_task(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_link_target FOREIGN KEY (target_task_id) REFERENCES project_task(id) ON DELETE CASCADE,
    CONSTRAINT chk_task_link_not_self CHECK (source_task_id <> target_task_id),
    CONSTRAINT chk_task_link_label_valid CHECK (length(trim(label)) BETWEEN 1 AND 50)
);

CREATE TABLE task_link_materialized (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL,
    origin_task_id UUID NOT NULL,
    terminal_task_id UUID NOT NULL,
    path_task_ids UUID[] NOT NULL,
    path_link_ids UUID[] NOT NULL,
    path_link_labels TEXT[] NOT NULL,
    depth INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_path_project FOREIGN KEY (fk_project_id) REFERENCES project(id) ON DELETE CASCADE,
    CONSTRAINT chk_task_path_depth CHECK (depth > 0 AND depth <= 10),
    CONSTRAINT chk_task_path_lengths CHECK (
        array_length(path_task_ids, 1) = depth + 1
        AND array_length(path_link_ids, 1) = depth
        AND array_length(path_link_labels, 1) = depth
    )
);

CREATE INDEX idx_task_link_source ON task_link(fk_project_id, source_task_id, created_at DESC);
CREATE INDEX idx_task_link_target ON task_link(fk_project_id, target_task_id, created_at DESC);
CREATE INDEX idx_task_link_pair ON task_link(fk_project_id, source_task_id, target_task_id);
CREATE INDEX idx_task_link_label ON task_link(fk_project_id, lower(trim(label)));

CREATE INDEX idx_task_path_origin_depth ON task_link_materialized(fk_project_id, origin_task_id, depth);
CREATE INDEX idx_task_path_terminal_depth ON task_link_materialized(fk_project_id, terminal_task_id, depth);
CREATE INDEX idx_task_path_task_ids ON task_link_materialized USING GIN (path_task_ids);
CREATE INDEX idx_task_path_link_ids ON task_link_materialized USING GIN (path_link_ids);
CREATE INDEX idx_task_path_link_labels ON task_link_materialized USING GIN (path_link_labels);
CREATE UNIQUE INDEX uniq_task_path_exact_links ON task_link_materialized(fk_project_id, path_link_ids);
