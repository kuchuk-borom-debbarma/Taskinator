# Requirements: Taskinator Autopilot System

**Defined:** 2026-05-22
**Milestone:** v16.0 Auto Action Runtime Integration
**Core Value:** Automate the "busy work" of project management through reliable, transparent, and high-speed execution chains.

## v16 Requirements

### Runtime Consumer

- [x] **RUNTIME-01**: Auto-action consumer can receive supported domain events and route them to the auto-action service.
- [x] **RUNTIME-02**: Auto-action service can find eligible rules for an event without coupling the consumer to internal query details.
- [x] **RUNTIME-03**: Auto-action service can trigger rule execution using existing context, condition, and action orchestration.
- [x] **RUNTIME-04**: Consumer handling preserves idempotency, trace/depth metadata, and failure visibility.

### GraphQL API

- [ ] **GQL-01**: User can create an auto-action rule through a GraphQL mutation.
- [ ] **GQL-02**: User can update an auto-action rule through a GraphQL mutation.
- [ ] **GQL-03**: User can query one auto-action rule by ID through GraphQL.
- [ ] **GQL-04**: User can list auto-action rules through a connection/edge paginated GraphQL query.
- [ ] **GQL-05**: GraphQL resolvers delegate domain work to auto-action service functions, not internal queries.

### Pagination & Loading

- [ ] **PAGE-01**: All auto-action list responses use connection/edge pagination.
- [ ] **PAGE-02**: Auto-action GraphQL nested fields use DataLoader for batched loading.
- [ ] **PAGE-03**: Auto-action list service returns stable cursors and total pagination metadata where project conventions require it.

### Service Design

- [x] **SVC-01**: Auto-action module exposes service functions needed by consumers and GraphQL without leaking internal engines.
- [x] **SVC-02**: New service functions stay small, readable, and single-purpose.
- [ ] **SVC-03**: Auto-action query functions remain internal to the module and are covered by focused tests where behavior is non-trivial.

## Future Requirements

### Runtime Expansion

- **FUTURE-01**: User can trigger auto actions across multiple domain scopes beyond the first supported event set.
- **FUTURE-02**: User can inspect rich execution history from GraphQL with filtering/search.
- **FUTURE-03**: User can run dry-run/simulation of auto-action rules before enabling them.

## Out of Scope

| Feature | Reason |
|---|---|
| Cron-based auto actions | Event-driven architecture remains primary focus. |
| External service/webhook actions | Current scope stays inside Taskinator domain mutations. |
| Full UI rebuild | This milestone is backend/runtime + GraphQL wiring. |

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| RUNTIME-01 | Phase 42 | Complete |
| RUNTIME-02 | Phase 42 | Complete |
| RUNTIME-03 | Phase 42 | Complete |
| RUNTIME-04 | Phase 42 | Complete |
| SVC-01 | Phase 42 | Complete |
| SVC-02 | Phase 42 | Complete |
| GQL-01 | Phase 43 | Pending |
| GQL-02 | Phase 43 | Pending |
| GQL-03 | Phase 43 | Pending |
| GQL-04 | Phase 43 | Pending |
| GQL-05 | Phase 43 | Pending |
| PAGE-01 | Phase 43 | Pending |
| PAGE-02 | Phase 43 | Pending |
| PAGE-03 | Phase 43 | Pending |
| SVC-03 | Phase 43 | Pending |

**Coverage:**
- v16 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-05-22*
*Last updated: 2026-05-22 after Phase 42 execution*
