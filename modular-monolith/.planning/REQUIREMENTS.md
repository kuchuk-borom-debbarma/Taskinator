# Requirements: Project-Level Throttling

## User Stories

- **US-1**: As a system administrator, I want to set resource limits per project so that one project cannot starve others.
- **US-2**: As a user, I want my project to remain responsive even if other projects are under heavy load.
- **US-3**: As a system administrator, I want to see which projects are being throttled so I can adjust limits or investigate abuse.

## Functional Requirements

### FR-1: Identity & Metering
- **REQ-ID-1**: Every operation (API, Outbox, Task) must be associated with a `projectId`.
- **REQ-ID-2**: `outbox_events` table must include `fk_project_id`.
- **REQ-ID-3**: System must track real-time resource usage per project in Redis.

### FR-2: Outbox Fairness
- **REQ-ID-4**: `PostgresOutboxRelay` must use fair-share fetching (e.g., `ROW_NUMBER()` over `fk_project_id`) to prevent one project from hogging the relay.
- **REQ-ID-5**: Batch processing limits must be applied per-project during relay.

### FR-3: API & Action Throttling
- **REQ-ID-6**: GraphQL middleware must enforce rate limits based on `projectId`.
- **REQ-ID-7**: `TaskService` must enforce concurrency limits for expensive graph operations.

### FR-4: Database Guardrails
- **REQ-ID-8**: Transactions must apply `SET LOCAL statement_timeout` based on project-specific limits.
- **REQ-ID-9**: Large bulk operations must be chunked or rejected if they exceed a project budget.

## Non-Functional Requirements
- **NFR-1**: Throttling check overhead must be < 5ms per request.
- **NFR-2**: System must not deadlock due to throttling-induced delays (reject instead of wait).

## Definition of Done
- [ ] Load test demonstrates Project A hitting limits while Project B remains unaffected.
- [ ] Metering metrics visible in logs/Prometheus.
- [ ] All `outbox_events` have valid `fk_project_id`.

