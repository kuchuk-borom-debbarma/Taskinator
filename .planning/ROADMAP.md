# Roadmap: Taskinator Autopilot System

## Milestones

- ✅ **v5.0 Revamp Autopilot** — Phase 21 (shipped 2026-05-16) [.planning/milestones/v5.0-ROADMAP.md]
- ✅ **v6.0 Rebuild Autopilot Engine** — Phases 22-25 (shipped 2026-05-16) [.planning/milestones/v6.0-ROADMAP.md]
- ✅ **v7.0 UI Alignment** — Phases 26-28 (shipped 2026-05-17) [.planning/milestones/v7.0-ROADMAP.md]
- ✅ **v8.0 High-Performance CTE & Depth Guards** — Phases 29-30 (shipped 2026-05-17) [.planning/milestones/v8.0-ROADMAP.md]
- ✅ **v9.0 Auto-Action Condition Component** — Phases 31-33 (shipped 2026-05-21) [.planning/milestones/v9.0-ROADMAP.md]
- ✅ **v10.0 Action & Condition Engine Isolation** — Phase 34 (shipped 2026-05-21) [.planning/milestones/v10.0-ROADMAP.md]
- ✅ **v11.0 Context Engine** — Phase 35 (shipped 2026-05-21) [.planning/milestones/v11.0-ROADMAP.md]
- ✅ **v12.0 Tied Rule Orchestration** — Phase 36 (shipped 2026-05-21) [.planning/v12.0-MILESTONE-AUDIT.md]
- ✅ **v13.0 Auto Action Re-sectoring** — Phase 37 (shipped 2026-05-21) [.planning/milestones/v13.0-ROADMAP.md]
- ✅ **v14.0 Hide Internal Engines** — Phase 38 (shipped 2026-05-21) [.planning/milestones/v14.0-ROADMAP.md]
- ✅ **v15.0 Service Layer Isolation** — Phases 39-41 (shipped 2026-05-22) [.planning/milestones/v15.0-ROADMAP.md]
- 🔄 **v16.0 Auto Action Runtime Integration** — Phases 42-43 (planned)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| 39. Smart Aggregator Isolation | v15.0 | 7/7 | Complete    | 2026-05-22 |
| 40. Intra-Module Listener Decoupling | v15.0 | 1/1 | Complete    | 2026-05-22 |
| 41. Inter-Module Listener Service Delegation | v15.0 | 1/1 | Complete    | 2026-05-22 |
| 42. Auto Action Event Consumer | v16.0 | 0/1 | Pending | - |
| 43. Auto Action GraphQL API | v16.0 | 0/1 | Pending | - |
| 38. Hide Internal Engines | v14.0 | 1/1 | ✅ Shipped | 2026-05-21 |
| 37. Auto Action Re-sectoring | v13.0 | 1/1 | ✅ Shipped | 2026-05-21 |

---

### Phase 39: Smart Aggregator Isolation
**Goal:** Isolate Smart Aggregators and refactor 21+ listeners to use Service layer.
**Requirements:** R1, R3, R4

**Plans:**
- [x] 39-01-PLAN.md — Aggregator Utility & Project Aggregator
- [x] 39-02-PLAN.md — Task & Team Aggregators
- [x] 39-03-PLAN.md — Auth Module Isolation
- [x] 39-04-PLAN.md — Project Module Isolation
- [x] 39-05-PLAN.md — Team Module Isolation
- [x] 39-06-PLAN.md — Task Module - Reachability & Graph
- [x] 39-07-PLAN.md — Task Module - Assignments & Project Deletions

### Phase 40: Intra-Module Listener Decoupling
**Goal:** Verify module listeners no longer own raw SQL or direct database write logic.
**Requirements:** R2

**Plans:**
- [x] 40-01-PLAN.md — Intra-Module Listener Decoupling Audit

### Phase 41: Inter-Module Listener Service Delegation
**Goal:** Verify listener write paths respect module boundaries through service delegation.
**Requirements:** R3, R4

**Plans:**
- [x] 41-01-PLAN.md — Inter-Module Listener Delegation Audit

### Phase 42: Auto Action Event Consumer
**Goal:** Connect domain events to auto-action rule lookup and execution through service boundaries.
**Requirements:** RUNTIME-01, RUNTIME-02, RUNTIME-03, RUNTIME-04, SVC-01, SVC-02

**Success Criteria:**
1. Supported domain events reach an auto-action consumer.
2. Consumer delegates rule lookup and execution to auto-action service functions.
3. Trigger path preserves idempotency, trace/depth, and failure visibility.
4. Consumer stays thin; internal engines remain hidden behind service layer.

**Plans:**
- [ ] 42-01-PLAN.md — Consumer & Service Runtime Wiring

### Phase 43: Auto Action GraphQL API
**Goal:** Expose auto-action query/mutation APIs with connection pagination and DataLoader batching.
**Requirements:** GQL-01, GQL-02, GQL-03, GQL-04, GQL-05, PAGE-01, PAGE-02, PAGE-03, SVC-03

**Success Criteria:**
1. GraphQL mutations create/update auto-action rules through service functions.
2. Single-rule query and list query work through established GraphQL patterns.
3. List query uses connection/edge pagination.
4. Nested field loading uses DataLoader to avoid N+1 behavior.
5. Tests cover resolver/service behavior and pagination shape.

**Plans:**
- [ ] 43-01-PLAN.md — GraphQL Mutations, Queries, Connections & DataLoader
