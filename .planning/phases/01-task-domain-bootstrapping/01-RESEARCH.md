# Phase 1 Research: Task Domain Bootstrapping

## Current State of Task Domain
- **Existing Entities:** `project_task`, `task_link`, and `task_reachability` are already fully defined and implemented in the database and `TaskService`.
- **Existing Features:** CRUD operations, adjacency list hierarchy tracking, denormalized counters, and optimistic locking are functioning. 
- **Outbox Pattern:** Mutations correctly write to `outbox_events` via CTEs, and a polling relay dispatches events to Kafka.

## Identified Gaps for the Rules Engine
1. **Execution Audit Log:** There is no existing audit log mechanism. We need a new table (e.g., `task_audit_log`) to track changes, especially those made automatically by background triggers.
2. **Correlation IDs:** The `outbox_events` table and Kafka publishing mechanism lack a `correlation_id` concept. This is required to trace a single user action through multiple chained trigger executions.
3. **GraphQL Mutations:** Need to ensure that the task mutations (create/update) can accept and propagate correlation IDs, or generate them if absent.

## Implementation Details Needed
### 1. `task_audit_log` Table
```sql
CREATE TABLE task_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fk_task_id UUID NOT NULL REFERENCES project_task(id),
    fk_project_id UUID NOT NULL REFERENCES project(id),
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'UPDATED', 'DELETED'
    changed_fields JSONB, -- Record of what changed
    correlation_id UUID NOT NULL,
    actor_id UUID NOT NULL, -- Who/what caused this
    trigger_source VARCHAR(255), -- If triggered by a rule, which rule?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Updating Outbox
Update `outbox_events` schema to include `correlation_id UUID`. Update `OutboxRelay` to pass this ID as a Kafka header.

### 3. Service Updates
Update `TaskService.ts` and `TaskQueries.ts` to log into `task_audit_log` inside the same CTE used for `outbox_events`. All methods should accept an optional `correlationId` (generating one if null).

## Next Steps
Produce a plan that focuses purely on implementing the Correlation ID and Execution Audit Log, as the rest of the Task Domain is complete.
