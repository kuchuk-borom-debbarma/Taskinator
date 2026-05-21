---
phase: 39-smart-aggregator-isolation
plan: 07
subsystem: task
tags: [task-service, cleanup, assignments, project-deletion, listeners, jest]

requires:
  - phase: 39-06
    provides: TaskService graph isolation pattern
provides:
  - TaskService cleanup handlers for member unassignment and team orphaning
  - TaskService chunked project deletion handlers for tasks, links, and reachability
  - Full task module listener delegation to TaskService
  - TaskService cleanup unit tests
affects: [task, project-aggregated-listeners, team-aggregated-listeners]

tech-stack:
  added: []
  patterns: [service-owned transaction/idempotency for listeners]

key-files:
  created:
    - modular-monolith/src/modules/task/internal/__tests__/TaskServiceCleanup.test.ts
  modified:
    - modular-monolith/src/modules/task/TaskService.ts
    - modular-monolith/src/modules/task/internal/TaskServiceImpl.ts
    - modular-monolith/src/modules/task/internal/__tests__/TaskServiceGraph.test.ts
    - modular-monolith/src/modules/task/internal/listeners/ProjectAggregated_UnassignProjectTaskMember.ts
    - modular-monolith/src/modules/task/internal/listeners/ProjectAggregated_DeleteProjectTask.ts
    - modular-monolith/src/modules/task/internal/listeners/ProjectAggregated_DeleteProjectTaskLink.ts
    - modular-monolith/src/modules/task/internal/listeners/ProjectAggregated_DeleteProjectReachability.ts
    - modular-monolith/src/modules/task/internal/listeners/TeamAggregated_OrphanTeamTasksListener.ts
    - modular-monolith/src/modules/task/internal/listeners/TeamAggregated_UnassignMemberFromTeamTasksListener.ts

key-decisions:
  - "TaskService owns idempotency and transaction boundaries for remaining task cleanup listener operations."
  - "Project cleanup chunk continuation signals remain transactional through appendEventsToOutbox inside TaskService."
  - "Team member unassignment is consolidated by team before query execution."

patterns-established:
  - "Project cleanup service methods de-duplicate project IDs across claimed batch events before chunked deletion."
  - "Assignment cleanup service methods consolidate user IDs across repeated project/team events."

requirements-completed: [R3, R4]

duration: 25min
completed: 2026-05-22
---

# Phase 39: Smart Aggregator Isolation Summary

**TaskService now owns the remaining task cleanup and assignment listener writes, completing task module listener delegation.**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-05-22T01:27:23+05:30
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added TaskService methods for project task member unassignment, team task orphaning, and team member task unassignment.
- Added TaskService methods for chunked project task, task link, and task reachability deletion.
- Refactored six remaining task listeners to delegate to `taskService`.
- Added focused cleanup tests covering grouping, chunk deletion calls, orphaning, and transaction/idempotency calls for every new method.
- Updated graph service tests to include the expanded TaskQueries mock surface.

## Task Commits

1. **Task 1: Update TaskService Interface and Implementation** - `4283261` (feat)
2. **Task 2: Create TaskService Cleanup Tests** - `4283261` (feat)
3. **Task 3: Refactor Remaining Task Module Listeners** - `4283261` (feat)

## Files Created/Modified

- `modular-monolith/src/modules/task/TaskService.ts` - Adds cleanup listener service contracts.
- `modular-monolith/src/modules/task/internal/TaskServiceImpl.ts` - Implements idempotent cleanup, assignment, and chunked project deletion operations.
- `modular-monolith/src/modules/task/internal/listeners/*.ts` - Remaining task aggregate listeners delegate to TaskService.
- `modular-monolith/src/modules/task/internal/__tests__/TaskServiceCleanup.test.ts` - Verifies TaskService cleanup processing.
- `modular-monolith/src/modules/task/internal/__tests__/TaskServiceGraph.test.ts` - Keeps graph tests compatible with the expanded service imports.

## Decisions Made

- Preserved existing chunk continuation semantics for project task, task link, and reachability deletion.
- Consolidated repeated team/user unassignment events by team to reduce duplicate query work.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The first focused run after 39-07 exposed an older graph-test mock missing newly imported TaskQueries exports; fixed before commit.
- The pre-commit `bun format` hook still reports generated coverage report parse/lint issues. The implementation commit succeeded and the worktree remained clean.

## User Setup Required

None - no external service configuration required.

## Verification

- `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/task/internal/__tests__/TaskServiceCleanup.test.ts src/modules/task/internal/__tests__/TaskServiceGraph.test.ts src/modules/team/internal/__tests__/TeamServiceBatch.test.ts src/modules/project/internal/__tests__/ProjectServiceBatch.test.ts src/modules/auth/internal/__tests__/AuthServiceBatch.test.ts src/utils/event-bus/__tests__/AggregatorService.test.ts` - passed, 26 tests.
- `rg "import \\{ db \\}|claimEventsAtomic|TaskQueries|OutboxQueries" modular-monolith/src/modules/task/internal/listeners` - no matches.
- `rg "taskService\\.handle|handleUnassignProjectTaskMember|handleDeleteProjectTask|handleDeleteProjectTaskLink|handleDeleteProjectReachability|handleOrphanTeamTasks|handleUnassignMemberFromTeamTasks" modular-monolith/src/modules/task` - passed.

## Self-Check: PASSED

- TaskService handles member unassignment and project cleanup.
- Task listeners are decoupled from direct DB transaction management.
- TaskService cleanup methods are verified by unit tests.

## Next Phase Readiness

All phase 39 plans are implemented. Phase-level review and verification can now run.

---
*Phase: 39-smart-aggregator-isolation*
*Completed: 2026-05-22*
