# Roadmap: Project-Level Throttling

## Phases

- [ ] **Phase 1: Database & Schema Evolution** - Establish project identity and infrastructure foundation.
- [ ] **Phase 2: Outbox Relay Fairness** - Implement fair-share scheduling for event processing.
- [ ] **Phase 3: API & Action Throttling** - Enforce rate and concurrency limits at the application boundary.
- [ ] **Phase 4: Database Guardrails** - Protect database resources with transaction timeouts and bulk operation limits.
- [ ] **Phase 5: Verification & Hardening** - Stress test the system and implement observability.

## Phase Details

### Phase 1: Database & Schema Evolution
**Goal**: Establish project identity across the system and prepare infrastructure.
**Mode**: mvp
**Depends on**: None
**Requirements**: REQ-ID-1, REQ-ID-2
**Success Criteria** (what must be TRUE):
  1. `outbox_events` table has a mandatory `fk_project_id` column with appropriate indexing.
  2. All internal operations (API, Task, Outbox) correctly capture and propagate `projectId` through the call stack.
  3. Redis infrastructure is configured for low-latency quota management.
**Plans**: TBD

### Phase 2: Outbox Relay Fairness
**Goal**: Ensure no single project can starve the event relay system.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: REQ-ID-4, REQ-ID-5
**Success Criteria** (what must be TRUE):
  1. The `PostgresOutboxRelay` fetches a balanced distribution of events using `ROW_NUMBER()` or similar window functions.
  2. A single project with a massive event backlog (100k+ events) does not prevent other projects from having their events processed in the next batch.
  3. Batch processing limits are strictly enforced at the project level during relay execution.
**Plans**: TBD

### Phase 3: API & Action Throttling
**Goal**: Protect system entry points and expensive service operations from overload.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: REQ-ID-3, REQ-ID-6, REQ-ID-7, NFR-1
**Success Criteria** (what must be TRUE):
  1. GraphQL middleware rejects requests with 429 status when project rate limits are exceeded.
  2. `TaskService` uses `Bottleneck` or similar to limit concurrent graph operations per project.
  3. Throttling check overhead is measured and remains < 5ms per request (NFR-1).
  4. Real-time resource usage is tracked and queryable in Redis.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Database Guardrails
**Goal**: Protect database resources with transaction timeouts and bulk operation limits.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: REQ-ID-8, REQ-ID-9, NFR-2
**Success Criteria** (what must be TRUE):
  1. DB transactions automatically apply `SET LOCAL statement_timeout` based on project-specific settings.
  2. Bulk operations (e.g., mass task creation) are rejected if the project's estimated resource "budget" is exceeded.
  3. System avoids deadlocks by failing fast rather than waiting for contested resources (NFR-2).
**Plans**: TBD

### Phase 5: Verification & Hardening
**Goal**: Stress test the system and implement observability.
**Mode**: mvp
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: US-1, US-2, US-3
**Success Criteria** (what must be TRUE):
  1. Load tests demonstrate Project A hitting limits while Project B's latency remains unaffected.
  2. Throttling events and per-project resource usage are visible in system logs and Prometheus metrics.
  3. High-load scenarios do not cause cascading failures or database connection exhaustion.
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database & Schema Evolution | 0/0 | Not started | - |
| 2. Outbox Relay Fairness | 0/0 | Not started | - |
| 3. API & Action Throttling | 0/0 | Not started | - |
| 4. Database Guardrails | 0/0 | Not started | - |
| 5. Verification & Hardening | 0/0 | Not started | - |
