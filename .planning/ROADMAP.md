# Roadmap: Taskinator Autopilot System

## Milestones

- ✅ **v5.0 Revamp Autopilot** — Phase 21 (shipped 2026-05-16)
- 🚧 **v6.0 Rebuild Autopilot Engine** — Phases 22-25 (in progress)

## Phases

<details>
<summary>✅ v5.0 Revamp Autopilot (Phase 21) — SHIPPED 2026-05-16</summary>

- [x] Phase 21: Legacy Engine Teardown (1/1 plans) — completed 2026-05-16

</details>

### 🚧 v6.0 Rebuild Autopilot Engine (In Progress)

- [x] Phase 22: Database Schema & Engine Primitives (1/1 plans) — completed 2026-05-16
- [ ] Phase 23: Condition Engine (1 plan)
- [ ] Phase 24: Action Engine & Lazy Resolution (1 plan)
- [ ] Phase 25: Pipeline Orchestrator (1 plan)

### Phase Details

**Phase 22: Database Schema & Engine Primitives**
Goal: Provision the database tables for the new three-layer Autopilot architecture.
Requirements: DB-01, DB-02, DB-03, DB-04, DB-05
Success criteria:
1. Schema defined and ORM models created
2. Unique hash constraints verified for conditions

**Phase 23: Condition Engine**
Goal: Implement the entity-agnostic condition evaluation logic, including structural hashing and composability.
**Plans:** 1 plan
Requirements: COND-01, COND-02, COND-03, COND-04, COND-05, COND-06
Plans:
- [ ] 23-01-PLAN.md — Implement core evaluation, hashing, and boolean logic.

Success criteria:
1. Entity-agnostic evaluation logic works
2. Structural hashing deduplicates correctly
3. AND/OR/NOT composability implemented

**Phase 24: Action Engine & Lazy Resolution**
Goal: Build the getter/setter sequence processor with lazy context resolvers for runtime entities.
Requirements: ACT-01, ACT-02, ACT-03
Success criteria:
1. Contexts resolve correctly at runtime (self, parent, etc)
2. Getter/setter API mutates state securely

**Phase 25: Pipeline Orchestrator**
Goal: Wire the conditions and actions into strict ordered execution pipelines that halt on condition failures.
Requirements: PIPE-01, PIPE-02, PIPE-03
Success criteria:
1. Pipelines execute sequentially
2. Halt on condition failure correctly guards action execution

## Progress

| Phase             | Milestone | Plans Complete | Status      | Completed  |
| ----------------- | --------- | -------------- | ----------- | ---------- |
| 21. Legacy Engine Teardown | v5.0      | 1/1            | Complete    | 2026-05-16 |
| 22. Database Schema | v6.0 | 1/1 | Complete | 2026-05-16 |
| 23. Condition Engine | v6.0 | 0/1 | Not started | - |
| 24. Action Engine | v6.0 | 0/1 | Not started | - |
| 25. Pipeline Orchestrator | v6.0 | 0/1 | Not started | - |
