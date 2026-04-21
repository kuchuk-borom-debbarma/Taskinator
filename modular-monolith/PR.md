# PR: Modular Monolith Cleanup & Query Encapsulation Refactor

## Description
This Pull Request transitions the codebase to a fully **Software-Defined Integrity** model. We have decoupled the cleanup architecture—moving away from fragile database-level cascades—and replaced it with a resilient, event-driven cleanup system. Furthermore, this PR enforces **Strict Query Encapsulation**, ensuring that the domain boundary of each module is respected by centralizing all SQL interactions within dedicated Query Repositories.

## Key Architectural Changes

### 1. Decentralized, Event-Driven Cleanup
- **Removed DB Cascades**: All `ON DELETE CASCADE` and `FOREIGN KEY` constraints have been removed from the schema to eliminate row-locking contention and high-latency cycles during large-scale deletions.
- **Modular Signaling**: Cleanup is now handled via signaling. When a project is deleted, the Project module publishes a signal to the **Transactional Outbox**.
- **Independent Listeners**: Domain-specific listeners in the Task and Team modules independently react to these signals and purge their own data.

### 2. Transactional Resilience & Atomic Idempotency
- **Atomic Claiming**: Integrated the `claimEventsAtomic` pattern within `db.transaction()` blocks. This ensures that events are only processed once and that cleanup is "Exactly-Once" even in the event of a server crash during the process.
- **No Orphaned Data**: By using the transactional outbox, we guarantee that the "Cleanup" intent is persisted alongside the core deletion, ensuring eventual consistency.

### 3. Strict Query Encapsulation (Repository Pattern)
- **Repository Consolidation**: All SQL `deleteFrom`, `insertInto`, and `updateTable` fragments have been moved from Kafka handlers and module listeners into:
    - [TaskQueries.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/task/internal/TaskQueries.ts)
    - [ProjectQueries.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/project/internal/ProjectQueries.ts)
    - [TeamQueries.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/team/internal/TeamQueries.ts)
- **Outbox Utility**: Created a centralized [OutboxQueries.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/utils/event-bus/OutboxQueries.ts) for consistent system-wide signaling.

## Verification
- [x] **Type Check**: Verified a clean build with `tsc --noEmit` (Exit code 0).
- [x] **Code Audit**: Verified zero direct database interactions remain in `src/kafka` and modular listeners using system-wide `grep`.
- [x] **Modular Integrity**: Confirmed that all module boundaries are respected; listeners now only call their own module's repository or the shared outbox service.

## Impacts
- **Performance**: Significant reduction in database locking during large project deletions.
- **Maintainability**: Infrastructure logic is now strictly separated from data access logic.
