---
phase: 04-ui-metadata-cleanup
plan: 01
subsystem: auto-action
tags: [cleanup, legacy, refactoring]
dependency_graph:
  requires: []
  provides: [cleaned-auto-action]
  affects: [auto-action-module, auto-action-tests]
tech_stack:
  added: []
  patterns: [cwb-exclusive]
key_files:
  created: []
  modified:
    - src/modules/auto-action/AutoActionService.ts
    - src/modules/auto-action/internal/service/AutoActionServiceImpl.ts
    - src/modules/auto-action/index.ts
    - src/modules/auto-action/types.ts
    - src/graphql/resolvers/autoAction.ts
    - src/graphql/schema/auto-action/auto-action-extension.graphql
  deleted:
    - src/modules/auto-action/internal/engines/
    - src/modules/auto-action/internal/execution/
    - src/modules/auto-action/scopes/task/
    - src/modules/auto-action/__tests__/autoAction.test.ts
    - src/modules/auto-action/__tests__/autoActionEngine.test.ts
    - src/modules/auto-action/__tests__/contextEngine.test.ts
    - src/modules/auto-action/__tests__/AutoActionRuntime.test.ts
    - src/tests/auto-action-idempotency.test.ts
decisions:
  - "Deleted legacy AST-based engines and executors as they are replaced by CWB logic."
  - "Removed `autoActionTemplate` GraphQL query and resolver as they depended on legacy engine metadata."
  - "Purged legacy tests that were no longer relevant to the CWB-only architecture."
metrics:
  duration: 15
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
---

# Phase 04 Plan 01: Legacy AST Code Cleanup Summary

**Goal:** Delete legacy AST-based code bloat and clean up the AutoAction module to be CWB-exclusive.

## Completed Work
1. Deleted legacy directories: `internal/engines`, `internal/execution`, `scopes/task`.
2. Removed legacy methods from `AutoActionService` and `AutoActionServiceImpl`.
3. Cleaned up `AutoActionTaskEventConsumer` to remove legacy execution paths.
4. Simplified `types.ts` by removing AST node schemas.
5. Removed `autoActionTemplate` query from GraphQL layer.
6. Deleted 5 legacy test files and updated remaining tests to fix compilation errors.

## Deviations from Plan
- Also deleted legacy test files that were causing compilation errors after the source code was removed.
- Removed `autoActionTemplate` GraphQL query which was not explicitly mentioned but was discovered to be legacy.

## Known Stubs
- None.

## Threat Flags
- None.

## Self-Check: PASSED
- Legacy directories are gone.
- Project compiles with `tsc`.
