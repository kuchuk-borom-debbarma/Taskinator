---
phase: 39-smart-aggregator-isolation
plan: 04
subsystem: project
tags: [project-service, listeners, counts, members, idempotency, jest]

requires:
  - phase: 39-01
    provides: Service-layer isolation pattern
provides:
  - ProjectService batch handlers for member, task, and team count sync
  - ProjectService batch handlers for member removal and project member purge
  - Project module listener delegation to ProjectService
  - ProjectService batch unit tests
affects: [project, project-aggregated-listeners, task-aggregated-listeners, team-aggregated-listeners]

tech-stack:
  added: []
  patterns: [service-owned transaction/idempotency for listeners]

key-files:
  created:
    - modular-monolith/src/modules/project/internal/__tests__/ProjectServiceBatch.test.ts
  modified:
    - modular-monolith/src/modules/project/ProjectService.ts
    - modular-monolith/src/modules/project/internal/ProjectServiceImpl.ts
    - modular-monolith/src/modules/project/internal/listeners/ProjectAggregated_ChangeProjectMemberCount.ts
    - modular-monolith/src/modules/project/internal/listeners/TaskAggregated_SyncProjectTaskCountListener.ts
    - modular-monolith/src/modules/project/internal/listeners/TeamAggregated_SyncProjectTeamCountListener.ts
    - modular-monolith/src/modules/project/internal/listeners/ProjectAggregated_RemoveProjectMember.ts
    - modular-monolith/src/modules/project/internal/listeners/ProjectAggregated_DeleteProjectMember.ts

key-decisions:
  - "ProjectService owns idempotency and transaction boundaries for project listener write operations."
  - "Listeners delegate raw DomainEvent batches directly to ProjectService methods."

patterns-established:
  - "Count-sync service methods consolidate deltas per project before calling bulk query primitives."
  - "Membership service methods de-duplicate batched IDs before calling purge query primitives."

requirements-completed: [R3, R4]

duration: 40min
completed: 2026-05-22
---

# Phase 39: Smart Aggregator Isolation Summary

**ProjectService now owns project aggregate listener writes for counts and memberships, with project listeners reduced to service delegation.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-05-22T01:35:00+05:30
- **Completed:** 2026-05-22T02:15:00+05:30
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added ProjectService methods for member, task, and team count synchronization.
- Added ProjectService methods for individual member removal and full project member purges.
- Refactored five project module listeners to delegate to `projectService`.
- Added focused tests covering count consolidation, member deletion grouping, project deletion grouping, and transaction/idempotency calls.

## Task Commits

1. **Task 1: Update ProjectService Interface and Implementation** - `f7999dc` (feat)
2. **Task 2: Create ProjectService Batch Sync Tests** - `f7999dc` (feat)
3. **Task 3: Refactor Project Module Listeners** - `f7999dc` (feat)

## Files Created/Modified

- `modular-monolith/src/modules/project/ProjectService.ts` - Adds batch listener service contracts.
- `modular-monolith/src/modules/project/internal/ProjectServiceImpl.ts` - Implements idempotent batch count and member operations.
- `modular-monolith/src/modules/project/internal/listeners/*.ts` - Project, Task, and Team aggregate listeners delegate to ProjectService.
- `modular-monolith/src/modules/project/internal/__tests__/ProjectServiceBatch.test.ts` - Verifies ProjectService batch processing.

## Decisions Made

- Used a private `handleProjectCountSync()` helper inside `ProjectServiceImpl` to avoid duplicating transaction, claim, and per-project delta consolidation across count handlers.
- Kept existing query primitives unchanged and moved only orchestration into the service layer.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The pre-commit `bun format` hook still reports generated coverage report parse/lint issues. The planned source files were formatted directly before commit.

## User Setup Required

None - no external service configuration required.

## Verification

- `bunx biome check --write --unsafe` on the eight 39-04 source/test files - passed.
- `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/project/internal/__tests__/ProjectServiceBatch.test.ts src/modules/auth/internal/__tests__/AuthServiceBatch.test.ts src/utils/event-bus/__tests__/AggregatorService.test.ts` - passed, 14 tests.
- `grep -E "handleProjectMemberCountSync|handleRemoveProjectMember|handleDeleteProjectMember|handleSyncProjectTaskCount|handleSyncProjectTeamCount" ProjectServiceImpl.ts` - passed.
- `rg "import \\{ db \\}|claimEventsAtomic|ProjectQueries" modular-monolith/src/modules/project/internal/listeners` - no matches.

## Self-Check: PASSED

- ProjectService handles aggregated member/task/team count synchronization.
- Project listeners are decoupled from direct DB transaction management.
- ProjectService batch methods are verified by unit tests.

## Next Phase Readiness

Team module listeners can now follow the same service-owned transaction/idempotency pattern in 39-05.

---
*Phase: 39-smart-aggregator-isolation*
*Completed: 2026-05-22*
