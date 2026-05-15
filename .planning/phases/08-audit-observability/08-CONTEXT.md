# Phase 08 Context: Audit Logging & Observability

## Decisions Locked

### 1. Database Schema (Option B)
We will implement a two-tier logging structure:
- **`autopilot_execution`**:
    - `id`: UUID (Primary Key)
    - `fk_autopilot_id`: UUID (Foreign Key)
    - `fk_target_id`: UUID (e.g., taskId)
    - `trace_id`: String (from Phase 07)
    - `trigger_event`: String
    - `status`: Enum (`STARTED`, `MATCHED`, `SKIPPED`, `COMPLETED`, `FAILED`)
    - `created_at`: Timestamp
- **`autopilot_step_log`**:
    - `id`: UUID
    - `fk_execution_id`: UUID (Foreign Key to `autopilot_execution`)
    - `action_type`: String
    - `status`: Enum (`SUCCESS`, `FAILURE`)
    - `error_message`: Text (nullable)
    - `position`: Integer
    - `created_at`: Timestamp

### 2. Real-time Notifications
- The `AutopilotEngine` and `ActionRunner` will publish `autopilot.execution.updated` events to the internal `eventBus`.
- A dedicated (simplified) SSE controller will listen for these events and stream them to connected clients.

### 3. Context & Retention
- **Context Snapshots**: Deferred (skipped for V1 to reduce complexity).
- **Retention Policy**: Implement a basic background job (or simple query on bootstrap) to delete logs older than **30 days**.

## Implementation Scope
- [NEW] Migration for `autopilot_execution` and `autopilot_step_log`.
- [NEW] `AuditService`: Centralized service for recording logs.
- [MODIFY] `AutopilotEngine`: Integrate `AuditService` calls.
- [MODIFY] `ActionRunner`: Integrate `AuditService` calls.
- [NEW] `SSEController`: Basic endpoint for streaming autopilot progress.

## Next Steps
- Create Implementation Plan.
- Verify audit log persistence and real-time streaming.
