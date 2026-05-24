-- Migration: Add locked_at lease column to outbox_events for recovery under crashes
-- This prevents the transactional outbox relay from permanently orphaning events in 'PROCESSING' state

-- 1. Add nullable locked_at column
ALTER TABLE outbox_events ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Add high-performance recovery index to optimize scanning processing items with expired locks
CREATE INDEX IF NOT EXISTS idx_outbox_events_recovery 
ON outbox_events (status, locked_at) 
WHERE status = 'PROCESSING';
