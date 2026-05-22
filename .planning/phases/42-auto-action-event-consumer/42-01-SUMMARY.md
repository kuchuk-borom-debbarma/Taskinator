---
phase: 42-auto-action-event-consumer
plan: 01
subsystem: auto-action
tags: [runtime, consumer, service-boundary, kafka, task-events]

requires:
  - phase: 41
    provides: service-layer isolation pattern
provides:
  - AutoAction task event consumer
  - AutoActionService task event trigger orchestration
  - AutoAction query boundary for runtime execution lookup
  - Focused runtime wiring tests
affects: [auto-action, kafka, task-events]

tech-stack:
  added: []
  patterns: [thin consumer, service-owned orchestration, internal query boundary]

key-files:
  created:
    - modular-monolith/src/modules/auto-action/internal/listeners/AutoActionTaskEventConsumer.ts
    - modular-monolith/src/modules/auto-action/__tests__/AutoActionRuntime.test.ts
  modified:
    - modular-monolith/src/kafka/registry.ts
    - modular-monolith/src/modules/auto-action/AutoActionService.ts
    - modular-monolith/src/modules/auto-action/internal/service/AutoActionServiceImpl.ts
    - modular-monolith/src/modules/auto-action/internal/queries/AutoActionQueries.ts
    - modular-monolith/src/modules/auto-action/internal/execution/executor.ts

key-decisions:
  - "Auto-action task event consumer stays thin: subscribe to task events and delegate batches to AutoActionService."
  - "Trigger matching lives in AutoActionServiceImpl so consumers do not import queries or engines."
  - "Pipeline executor no longer imports db directly; execution lookup routes through AutoActionQueries."
  - "Phase 42 supports task.created and task.updated; task.deleted is intentionally skipped until delete semantics have explicit trigger/context support."

patterns-established:
  - "Auto-action runtime wiring uses the same listener + service boundary pattern as task/project/team listeners."
  - "Flexible trigger matching accepts string triggers and object triggers with type/triggerType/eventType plus optional scope."

requirements-completed: [RUNTIME-01, RUNTIME-02, RUNTIME-03, RUNTIME-04, SVC-01, SVC-02]

duration: 45min
completed: 2026-05-22
---

# Phase 42: Auto Action Event Consumer Summary

**Auto actions now have runtime task-event wiring through a thin Kafka consumer and service-owned trigger orchestration.**

## Accomplishments

- Added `AutoActionTaskEventConsumer` that subscribes to task created/updated events and delegates batches to `autoActionService.handleTaskEvents`.
- Registered the auto-action task event consumer in the Kafka consumer registry.
- Added `AutoActionService.handleTaskEvents` and internal helper methods for normalization, trigger matching, active rule lookup, and pipeline dispatch.
- Added query boundary functions for active project auto-action lookup and execution lookup.
- Removed direct `db` access from the auto-action pipeline executor.
- Added focused runtime tests for consumer subscription/delegation, matching rule execution, and unsupported/malformed event skipping.

## Verification

- `bun x tsc --noEmit` - passed.
- `bun test src/modules/auto-action/__tests__/autoAction.test.ts src/modules/auto-action/__tests__/autoActionEngine.test.ts src/modules/auto-action/__tests__/AutoActionRuntime.test.ts` - passed, 40 tests.
- `bunx biome check --write --unsafe src/modules/auto-action/AutoActionService.ts src/modules/auto-action/internal/service/AutoActionServiceImpl.ts src/modules/auto-action/internal/queries/AutoActionQueries.ts src/modules/auto-action/internal/execution/executor.ts src/modules/auto-action/internal/listeners/AutoActionTaskEventConsumer.ts src/modules/auto-action/__tests__/AutoActionRuntime.test.ts src/kafka/registry.ts` - passed, fixed formatting in 1 file.
- `rg "from ['\\\"].*database|\\bdb\\." src/modules/auto-action/internal/execution src/modules/auto-action/internal/listeners` - no matches.
- `rg "internal/queries|internal/engines" src/modules/auto-action/internal/listeners` - no matches.
- `rg "AutoActionTaskEventConsumer" src/kafka/registry.ts src/modules/auto-action/internal/listeners` - passed.

## Deviations from Plan

### [Rule 1 - Test Runner Fit] Use Bun test for focused auto-action tests

- **Found during:** Verification.
- **Issue:** Jest could not resolve existing `.js` ESM imports for these Bun-style auto-action tests.
- **Fix:** Added the new focused test in the same `bun:test` style as existing auto-action tests and verified it with `bun test`.
- **Files modified:** `AutoActionRuntime.test.ts`.
- **Verification:** Combined Bun test command passed 40 tests.

**Total deviations:** 1 auto-fixed.
**Impact:** No product behavior change; verification now matches existing local test style.

## Deferred

- GraphQL query/mutation, connection pagination, and DataLoader remain Phase 43.
- `task.deleted` trigger support remains deferred until delete-trigger context/action semantics are explicit.

## Self-Check: PASSED

- Consumer is thin and does not import internal queries or engines.
- AutoActionService owns rule lookup and pipeline trigger orchestration.
- Executor DB read moved behind query boundary.
- Required v16 Phase 42 requirements are complete.

---
*Phase: 42-auto-action-event-consumer*
*Completed: 2026-05-22*
