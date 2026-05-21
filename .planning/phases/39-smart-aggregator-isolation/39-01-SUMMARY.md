---
phase: 39-smart-aggregator-isolation
plan: 01
subsystem: event-bus
tags: [smart-aggregator, outbox, idempotency, kafka, jest]

requires: []
provides:
  - Generic AggregatorService for atomic claim-fold-outbox processing
  - Project smart aggregator refactor onto AggregatorService
  - AggregatorService unit test coverage
affects: [smart-aggregator, project-events, outbox]

tech-stack:
  added: []
  patterns: [service-owned transaction boundary, synchronous aggregator folder callback]

key-files:
  created:
    - modular-monolith/src/utils/event-bus/AggregatorService.ts
    - modular-monolith/src/utils/event-bus/__tests__/AggregatorService.test.ts
  modified:
    - modular-monolith/src/utils/event-bus/index.ts
    - modular-monolith/src/kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts

key-decisions:
  - "AggregatorService owns transaction, idempotency claim, and outbox append; domain aggregators provide only folding logic."
  - "ProjectEvents_BatchAggregator keeps existing chronological folding and signal construction semantics inside the folder callback."

patterns-established:
  - "Smart aggregators call aggregatorService.processAggregatorBatch(groupId, events, folder) and return outbox entries from the folder."
  - "AggregatorService tests mock db, idempotency, and outbox modules with Jest ESM unstable_mockModule before dynamic imports."

requirements-completed: [R1, R4]

duration: 45min
completed: 2026-05-22
---

# Phase 39: Smart Aggregator Isolation Summary

**Generic AggregatorService now owns atomic claim-fold-outbox processing, with ProjectEvents_BatchAggregator refactored onto the shared service.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-05-22T00:04:48+05:30
- **Completed:** 2026-05-22T00:49:00+05:30
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `AggregatorService.processAggregatorBatch()` to encapsulate transaction start, idempotency claim, folder execution, and transactional outbox append.
- Refactored the Project smart aggregator to remove direct database/idempotency/outbox write management while preserving project-specific semantic folding.
- Added focused Jest coverage for transaction startup, idempotency claiming, no-op batches, outbox appends, empty folder results, and thrown failures.

## Task Commits

1. **Task 1: Create AggregatorService** - `5f3a797` (feat)
2. **Task 2: Create AggregatorService Unit Tests** - `3359547` (test)
3. **Task 3: Refactor ProjectEvents_BatchAggregator** - `3359547` (test commit also captured refactor)

## Files Created/Modified

- `modular-monolith/src/utils/event-bus/AggregatorService.ts` - Generic smart aggregator lifecycle service.
- `modular-monolith/src/utils/event-bus/index.ts` - Exports the aggregator service.
- `modular-monolith/src/utils/event-bus/__tests__/AggregatorService.test.ts` - Focused unit tests for service control flow and error propagation.
- `modular-monolith/src/kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts` - Project aggregator refactored to delegate lifecycle handling to `aggregatorService`.

## Decisions Made

- Kept the folder callback synchronous because the current project folding logic is pure data transformation and the service owns the only write operation.
- Used the shared singleton `aggregatorService` from the event-bus utility barrel to match the existing service import style.

## Deviations from Plan

### Auto-fixed Issues

**1. Manual close-out after partial prior commit**
- **Found during:** Safe resume gate
- **Issue:** `feat(39-01): create AggregatorService` existed without `39-01-SUMMARY.md`; only Task 1 had been committed.
- **Fix:** Completed the missing unit test and Project aggregator refactor, then created this summary.
- **Files modified:** `AggregatorService.test.ts`, `ProjectEvents_BatchAggregator.ts`, `39-01-SUMMARY.md`
- **Verification:** Focused Jest suite passed.
- **Committed in:** `3359547`

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** The plan is now complete; Task 2 and Task 3 share one recovery commit because they were completed during manual close-out.

## Issues Encountered

- The project `bun run test <path>` script still swept the full Jest test suite because of the configured `--testMatch`, which started E2E tests and Redis connections in the sandbox. The runaway process was terminated and the focused suite was rerun with direct Jest `--runTestsByPath`.
- The pre-commit `bun format` hook scans generated `coverage/lcov-report/*.html` files and reports parse errors. The commit still completed; no source-format errors were found in the changed files.

## User Setup Required

None - no external service configuration required.

## Verification

- `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/utils/event-bus/__tests__/AggregatorService.test.ts` - passed, 6 tests.
- `grep "processAggregatorBatch" modular-monolith/src/utils/event-bus/AggregatorService.ts` - passed.
- `grep "aggregatorService.processAggregatorBatch" modular-monolith/src/kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts` - passed.
- `rg "import \\{ db \\}|claimEventsAtomic|appendEventsToOutbox" modular-monolith/src/kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts` - no matches.

## Self-Check: PASSED

- AggregatorService orchestrates atomic aggregator lifecycle.
- Project aggregator no longer manages direct database transactions.
- AggregatorService has focused unit coverage.

## Next Phase Readiness

Wave 2 aggregators and listeners can now reuse `aggregatorService.processAggregatorBatch()` instead of duplicating transaction/idempotency/outbox plumbing.

---
*Phase: 39-smart-aggregator-isolation*
*Completed: 2026-05-22*
