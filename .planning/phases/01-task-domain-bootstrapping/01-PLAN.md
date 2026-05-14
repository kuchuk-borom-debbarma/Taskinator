# Phase 1 Plan: Task Domain Bootstrapping

## Overview
The core Task Domain is already implemented. This plan focuses exclusively on adding the **Execution Audit Log** and **Correlation IDs** required for the Rules Engine. Based on review, Correlation IDs will be specific to trigger execution contexts and generated solely on the backend.

## Schema Push Requirement
**[BLOCKING] Schema Push Required**
This phase modifies schema-relevant files (Kysely migrations/tables). Ensure to run `bun run check-types` and handle the Kysely migrations properly to push the schema changes to the database.

## Tasks

### 1. Database Schema Updates
- **[NEW]** Create migration file `modular-monolith/src/database/migrations/{timestamp}_add_task_audit_log.ts`.
  - Add `task_audit_log` table with columns: `id` (UUID), `fk_task_id` (UUID), `fk_project_id` (UUID), `action` (VARCHAR), `changed_fields` (JSONB), `correlation_id` (UUID, nullable), `actor_id` (UUID), `trigger_source` (VARCHAR, nullable), `created_at` (TIMESTAMP).
- **[NEW]** `modular-monolith/src/database/tables/TaskAuditLog.ts`: Define `TaskAuditLogTable`.
- *(Note: `outbox_events` schema remains untouched. Correlation IDs will just be injected into the generic `payload` JSON.)*

### 2. Task Service & Queries Update
- **[MODIFY]** `modular-monolith/src/modules/task/internal/TaskQueries.ts`: 
  - Update `insertTask`, `updateTask`, `deleteTask`, `insertTaskLink`, etc. to accept optional `correlationId: string` and `triggerSource?: string`.
  - Inside the CTE for each mutation, add an `INSERT INTO task_audit_log` statement.
  - Update the `INSERT INTO outbox_events` CTE to inject `correlationId` into the `payload` JSON if provided.
- **[MODIFY]** `modular-monolith/src/modules/task/TaskService.ts` & `TaskServiceImpl.ts`:
  - Update all write operation signatures to include `correlationId?: string` and `triggerSource?: string` for internal usage only (not exposed via GraphQL).

### 3. Documentation
- **[NEW]** Create `modular-monolith/docs/Trigger_Execution_Tracing.md` to document the new `task_audit_log`, how Correlation IDs flow in the `payload`, and the lifecycle of tracing triggers.

### 4. Verification
- Verify Kysely migrations run successfully.
- Verify the typescript build succeeds.
- Verify `task_audit_log` gets populated with and without correlation IDs correctly.
