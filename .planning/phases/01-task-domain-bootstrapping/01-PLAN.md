# Phase 1 Plan: Task Domain Bootstrapping

## Overview
The core Task Domain is already implemented. This plan focuses on pulling forward the `project_trigger` table schema and adding the **Execution Audit Log** with **Correlation IDs** to support trigger chaining and loop detection.

## Schema Push Requirement
**[BLOCKING] Schema Push Required**
This phase modifies schema-relevant files (Kysely migrations/tables). Ensure to run `bun run check-types` and handle the Kysely migrations properly to push the schema changes to the database.

## Tasks

### 1. Database Schema Updates
- **[NEW]** Create migration file `modular-monolith/src/database/migrations/{timestamp}_add_triggers_and_audit.ts`.
  - Add `project_trigger` table: `id` (UUID), `fk_project_id` (UUID), `name` (VARCHAR), `condition` (JSONB), `action` (JSONB), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP).
  - Add `task_audit_log` table: `id` (UUID), `fk_task_id` (UUID), `fk_project_id` (UUID), `action` (VARCHAR), `changed_fields` (JSONB), `correlation_id` (UUID, nullable), `actor_id` (UUID), `trigger_id` (UUID, nullable), `created_at` (TIMESTAMP).
- **[NEW]** `modular-monolith/src/database/tables/ProjectTrigger.ts`: Define `ProjectTriggerTable`.
- **[NEW]** `modular-monolith/src/database/tables/TaskAuditLog.ts`: Define `TaskAuditLogTable`.
- *(Note: `outbox_events` schema remains untouched. Correlation IDs will just be injected into the generic `payload` JSON.)*

### 2. Task Service & Queries Update
- **[MODIFY]** `modular-monolith/src/modules/task/internal/TaskQueries.ts`: 
  - Update mutations (`insertTask`, `updateTask`, etc.) to accept optional `correlationId: string` and `triggerId?: string`.
  - Inside the CTE for each mutation:
    - **Loop Detection**: Check `task_audit_log` to ensure this `trigger_id` hasn't already modified this `fk_task_id` in the same `correlation_id` chain. If so, abort silently.
    - Add an `INSERT INTO task_audit_log`.
    - Update the `INSERT INTO outbox_events` CTE to inject `correlationId` into the `payload` JSON if provided.
- **[MODIFY]** `modular-monolith/src/modules/task/TaskService.ts` & `TaskServiceImpl.ts`:
  - Update write operation signatures to include `correlationId?: string` and `triggerId?: string` for internal usage only.

### 3. Documentation
- **[NEW]** Create `modular-monolith/docs/Trigger_Execution_Tracing.md` to document the new `task_audit_log`, how Correlation IDs flow in the `payload`, the chaining mechanism via outbox, and the loop detection logic.

### 4. Verification
- Verify Kysely migrations run successfully.
- Verify `task_audit_log` gets populated with loop detection working.
