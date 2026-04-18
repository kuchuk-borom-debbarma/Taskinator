ALTER TABLE project_task 
ADD COLUMN IF NOT EXISTS direct_incoming_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS direct_outgoing_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_incoming_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_outgoing_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS incoming_label_counts JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS outgoing_label_counts JSONB DEFAULT '{}';
