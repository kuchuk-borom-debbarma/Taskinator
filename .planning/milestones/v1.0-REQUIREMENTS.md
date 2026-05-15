# Requirements: Taskinator Autopilot System

**Defined:** 2026-05-15
**Core Value:** Automate the "busy work" of project management through reliable, transparent, and high-speed execution chains.

## v1 Requirements

### Core Engine
- [ ] **AUTO-01**: Autopilot definitions can be stored in the database (Trigger, Condition Tree, Action Chain).
- [ ] **AUTO-02**: The engine can listen for all domain events within a project via Kafka.
- [ ] **AUTO-03**: The engine can retrieve "Live Context" (fresh state) from the DB for condition evaluation.
- [ ] **AUTO-04**: The engine supports Boolean logic (AND, OR, NOT) in condition trees.

### Action Chaining
- [ ] **EXEC-01**: Actions are executed as an ordered sequence (Linked List).
- [ ] **EXEC-02**: If any action in a chain fails, the subsequent actions are aborted (Fail-Fast).
- [ ] **EXEC-03**: The engine supports task-level actions (Update Status, Assign Member).

### Safety & Observability
- [ ] **SAFE-01**: The system detects and breaks infinite loops using TraceID and Mutation Hashing.
- [ ] **AUDT-01**: Every autopilot execution is logged to a persistent audit table.
- [ ] **AUDT-02**: Autopilot logs are pushed to the UI in real-time via SSE.

## v2 Requirements

### Advanced Logic
- **ADV-01**: Support for Team and Project-level conditions/actions.
- **ADV-02**: Support for external webhooks as actions.
- **ADV-03**: Cross-project autopilot triggers.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Visual Rule Builder | Complexity deferred to later milestone; V1 is data-driven. |
| Time-based Triggers | V1 focus is purely reactive/event-driven. |
| Manual Override | Initial version assumes autopilot logic is authoritative once triggered. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTO-01 | Phase 1 | Complete |
| AUTO-02 | Phase 6 | Complete |
| AUTO-03 | Phase 2 | Complete |
| AUTO-04 | Phase 3 | Complete |
| EXEC-01 | Phase 4 | Complete |
| EXEC-02 | Phase 4 | Complete |
| EXEC-03 | Phase 5 | Complete |
| SAFE-01 | Phase 7 | Complete |
| AUDT-01 | Phase 8 | Complete |
| AUDT-02 | Phase 8 | Complete |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-15*
*Last updated: 2026-05-15 after initialization*
