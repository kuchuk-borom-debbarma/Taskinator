# Phase 1 Plan: Task Domain Bootstrapping

## Overview
The core Task Domain is already implemented. This plan focuses exclusively on adding the **Execution Audit Log** and **Correlation IDs** required for the Rules Engine.

## Schema Push Requirement
**[BLOCKING] Schema Push Required**
This phase modifies schema-relevant files (Kysely migrations/tables). Ensure to run `bun run check-types` and handle the Kysely migrations properly to push the schema changes to the database.

## Tasks

### 1. Database Schema Updates
- **[NEW]** Create migration file `modular-monolith/src/database/migrations/{timestamp}_add_task_audit_log.ts`.
  - Add `task_audit_log` table with columns: `id` (UUID), `fk_task_id` (UUID), `fk_project_id` (UUID), `action` (VARCHAR), `changed_fields` (JSONB), `correlation_id` (UUID), `actor_id` (UUID), `trigger_source` (VARCHAR, nullable), `created_at` (TIMESTAMP).
  - Add `correlation_id` (UUID, not null) to `outbox_events` table.
- **[MODIFY]** `modular-monolith/src/database/tables/OutboxEvent.ts`: Add `correlation_id` to interface.
- **[NEW]** `modular-monolith/src/database/tables/TaskAuditLog.ts`: Define `TaskAuditLogTable`.

### 2. Task Service & Queries Update
- **[MODIFY]** `modular-monolith/src/modules/task/internal/TaskQueries.ts`: 
  - Update `insertTask`, `updateTask`, `deleteTask`, `insertTaskLink`, etc. to accept `correlationId: string` and `triggerSource?: string`.
  - Inside the CTE for each mutation, add an `INSERT INTO task_audit_log` statement.
  - Update the `INSERT INTO outbox_events` CTE to include the `correlationId`.
- **[MODIFY]** `modular-monolith/src/modules/task/TaskService.ts` & `TaskServiceImpl.ts`:
  - Update all write operation signatures to include `correlationId?: string` and `triggerSource?: string`.
  - Inside implementations, default `correlationId` to `crypto.randomUUID()` if not provided.

### 3. Event Bus Integration
- **[MODIFY]** `modular-monolith/src/utils/event-bus/OutboxRelay.ts`:
  - When publishing to Kafka, map the database `correlation_id` to the Kafka message header `X-Correlation-ID`.

### 4. Verification
- Verify Kysely migrations run successfully.
- Verify the typescript build succeeds.
- Verify `task_audit_log` gets populated on task creation.
