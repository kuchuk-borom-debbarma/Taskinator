# Pull Request: Task Domain E2E Hardening & Graph Engine Stabilization

## Summary
This PR completes the end-to-end verification and architectural hardening of the **Task Domain**, with a specific focus on the **Task Reachability Engine** and the **Task Link lifecycle**. It ensures that the modular monolith maintains a strictly consistent dependency graph through transactional outbox events and event-driven background processing.

## Key Changes

### 1. Comprehensive E2E Verification Suite
- **Full Domain Coverage**: Implemented 41 new E2E tests across 6 dedicated suites covering the entire Task and Task Link lifecycle.
- **Link Lifecycle**:
    - **Creation**: Verified transitive reachability expansion (e.g., A -> B -> C auto-discovers A -> C).
    - **Deletion**: Verified "Recursive Repair" strategy to handle bridge link removals without orphaning alternative paths.
    - **Update**: Implemented link redirection (changing source/target) and verified path migration.
- **Side-Effect Verification**: All tests use polling patterns to verify eventual consistency of denormalized counters and closure table entries across the Kafka pipeline.

### 2. Core Logic & API Hardening
- **GraphQL API**: Fixed a missing `updateLink` resolver in the `TaskMutation` namespace that was preventing link modifications.
- **Graph Counter Sync**: Enhanced `syncTaskGraphCounters` to synchronize both **direct** (immediate dependency) and **total** (transitive) incoming/outgoing counts.
- **Event Orchestration**: Fixed a PostgreSQL type inference bug in the `deleteTaskLink` outbox payload that caused runtime failures during link removal.
- **Data Integrity**: Enforced `uq_task_link_source_target` unique constraint at the database level to prevent duplicate dependency links.

### 3. Reliability & Testing Infrastructure
- **Wipe Script**: Added `src/tests/e2e/scripts/wipe-schema.ts` to ensure clean database states between test runs, preventing flaky tests due to residual state.
- **Error Handling**: Hardened validation logic for Task Link creation to prevent self-referencing links and cross-project link attempts.

## Impact
- **Production-Ready Tasks**: The Task domain is now the most heavily verified module in the system, with 100% test coverage for complex graph operations.
- **Zero Orphaned Paths**: Recursive CTE repair logic guarantees that the reachability closure table never contains "zombie" paths after link deletions.
- **UI Consistency**: Real-time counter synchronization ensures that the project dashboard reflects the true state of the task graph.

## Verification Results
- [x] **41/41 E2E Tests Passing** (Task CRUD + Link CRUD).
- [x] Transitive expansion verified (A -> B, B -> C => A -> C).
- [x] Transitive contraction verified (A -> B -> C bridge removal).
- [x] GraphQL `updateLink` mutation verified.
- [x] Authorization checks verified (Owner, Member, Stranger).

## Related Documentation
- [docs/13. Task Graph Schema Design.md](docs/13. Task Graph Schema Design.md)
- [docs/19. Atomic Event Orchestration.md](docs/19. Atomic Event Orchestration.md)
