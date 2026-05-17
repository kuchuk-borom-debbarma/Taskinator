---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: High-Performance CTE & Depth Guards
status: In Progress
last_updated: "2026-05-17T21:05:00.000Z"
last_activity: 2026-05-17 — Milestone v8.0 started
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 4
  completed_plans: 0
  percent: 0
---

# Project State - Milestone v8.0 (CTE & Depth Guards)

## Active Phase: Phase 29 - CTE Bulk Outbox Writes

- [ ] **CTE-01**: Define Kysely dynamic CTE bulk updates with old_state select.
- [ ] **CTE-02**: Execute single transaction CTE flushing to database and inserting outbox events.
- [ ] **CTE-03**: Verify CTE query pattern with `SmartAggregator` unit tests.

## Pending Phase: Phase 30 - Asynchronous Depth Guards

- [ ] **LGP-01**: Match `actorId` and capture `depth` in `AutopilotTriggerListener.ts`.
- [ ] **LGP-02**: Process and increment depth recursive payloads in `PipelineEventListener.ts`.
- [ ] **LGP-03**: Enforce strict loop depth boundaries (max 50 hops) in `PipelineOrchestrator.ts`.

## Progress

- [ ] Phase 29 Planning & Execution (Active)
- [ ] Phase 30 Planning & Execution (Pending)

## Blockers

- None.

## Next Step

- Propose implementation plan for Phase 29.
