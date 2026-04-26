# Pull Request: Unified E2E Infrastructure & High-Performance Domain Hardening (10k RPS)

## Summary
This PR introduces a robust, industry-standard **End-to-End (E2E) Testing Framework** and implements critical performance optimizations across the **Project**, **Task**, and **Team** modules. The system is now architecture-ready for **10k RPS**, featuring atomic transactional processing, a reactive outbox relay, and a high-performance reachability engine.

## Key Changes

### 1. Unified Bootstrap & E2E Framework
- **`app.ts` Integration**: Refactored the system entry point to use a unified `bootstrap()` function. This ensures **100% parity** between production and E2E testing environments.
- **Isolated Testing Environment**:
    - **Infrastructure-as-Code**: Docker-compose setup using `tmpfs` for RAM-based database operations, ensuring sub-second cleanup between test runs.
    - **Isolated Ports**: E2E runs on dedicated ports (DB: 5435, Kafka: 9094, Redis: 6380) to avoid developer local environment conflicts.
    - **Tooling**: Integrated `supertest` for direct GraphQL layer testing and `kysely` for immediate database state verification.
- **Coverage & Mutation Testing**: Added Stryker integration for mutation testing on critical paths (`project-members`, `task-flow`) and full coverage reporting for the E2E suite.

### 2. High-Performance Domain Hardening (10k RPS)
- **Project Module**:
    - **Atomic Member Management**: Implemented `WITH` clause CTEs for batch member additions/removals with built-in authorization checks and outbox signaling in a single atomic database trip.
    - **Batch Counter Repairs**: Added high-efficiency bulk increment/decrement queries for project stats (`members_count`, `tasks_count`, `teams_count`).
- **Task Domain & Reachability**:
    - **Closure Table Engine**: Transitioned to a Closure Table pattern for $O(1)$ transitive reachability lookups.
    - **Recursive Repair**: Implemented a "Delete-and-Repair" strategy using Recursive CTEs to handle link removals while preserving alternative dependency paths (solving the "Diamond" problem).
    - **Graph Counter Sync**: Integrated background synchronization for both direct and total (transitive) dependency counters.
- **Team Module**: Hardened membership lifecycle and synchronized team-level task counts.

### 3. Advanced Event Orchestration
- **Reactive Outbox Relay**: 
    - Migrated from simple polling to a **Reactive Relay** using PostgreSQL `LISTEN/NOTIFY`.
    - Added **Safety Polling** and `FOR UPDATE SKIP LOCKED` batching to handle high concurrency and potential network drops.
- **Causal Ordering**: Smart Aggregators now enforce chronological event processing by timestamp, preventing race conditions between `Create -> Update -> Delete` events.
- **Real-time Bridge**: Integrated `RealtimeRedisBridge` to stream state changes to the frontend layer.

### 4. Quality & Stability
- **Stress Testing**: Added 6+ dedicated stress test suites verifying high-concurrency project creation, member volume, and task graph reachability under load.
- **Schema Hardening**: Added database-level unique constraints (`uq_task_link_source_target`) and monotonic outbox sequencing via `BIGSERIAL`.
- **Cleaner Lifecycle**: Implemented `wipe-schema.ts` and `apply-schema.ts` for deterministic test environments.

## Impact
- **Architectural Parity**: E2E tests now mirror production behavior exactly, catching bugs in background listeners and outbox delivery.
- **Scalability**: Sub-graph operations and membership management are now optimized for high-volume enterprise projects.
- **Zero Orphan Data**: Transactional CTEs and recursive repair logic eliminate zombie links and inconsistent counts.

## Verification Results
- [x] **41+ E2E Test Suites Passing** across all domains.
- [x] **Mutation Testing Passed** for Project and Task write-paths.
- [x] **Stress Tests Verified** for 10k RPS architecture compliance.
- [x] **Outbox Reliability** verified under high-volume event bursts.

## Related Documentation
- [docs/13. Task Graph Schema Design.md](docs/13. Task Graph Schema Design.md)
- [docs/19. Atomic Event Orchestration.md](docs/19. Atomic Event Orchestration.md)
- [src/tests/e2e/instructions.md](src/tests/e2e/instructions.md)
