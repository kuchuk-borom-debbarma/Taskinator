# Pull Request: Implement Transactional Outbox Pattern & EDA Test Modernization

## 📋 Overview
This pull request transitions the Taskinator Modular Monolith architecture from simple state-based logic into a highly robust **Event-Driven Architecture (EDA)** built around the **Transactional Outbox Pattern**. It completely modernizes our testing suite by removing experimental mock utilities in favor of end-to-end integration tests validated against a live PostgreSQL repository using Kysely.

## 🚀 Architectural Changes

### 1. Transactional Outbox Implementation (wCTE)
- Refactored core domain queries (`TaskQueries`, `ProjectQueries`, `TeamQueries`) to utilize **Writeable Common Table Expressions (wCTEs)**.
- Mutations are now guaranteed atomicity. When an entity is created, updated, or deleted, an event is synchronously authored directly into the `outbox_events` table within the same transaction.
- Eliminates "dual-write" vulnerabilities ensuring exactly-once processing pipelines.

### 2. Outbox Relay Daemon
- Created `OutboxRelay` (`src/utils/event-bus/OutboxRelay.ts`) which independently polls `outbox_events` and delegates the payloads onto the local `MemoryBus` for consumer listeners.

## 🧪 Testing Suite Modernization
- **Removed `jest.unstable_mockModule`:** Purged all fragile mock layers hiding underlying database execution issues.
- **Real World PostgreSQL Validation:** Migrated to full integration testing simulating genuine application flows from REST layer mutations down to asynchronous event consumption.
- **Listener Teardown Management:** Solved Jest execution hanging bugs by securely tearing down unhandled listeners in testing `afterAll()` lifecycle bindings.
- **Test Factories Enhanced:** Strengthened `factories.ts` to strictly adhere to relational invariants (e.g. `createChildTask` forcibly linking parent UUID bindings down the schema).

## 🪲 Critical Fixes
- **Kysely Query Execution Defects:** Found & resolved testing regressions where empty result sets executed via `.executeTakeFirst()` produced anonymous mapping objects `{}` instead of `undefined`. Safeguarded data access by enforcing `.selectAll()` uniformly across test retrieval layers.
- **Cascaded Task Type Formatting:** Enforced `::uuid`, `::text`, and `::jsonb` type coercions on raw Kysely Postgres builders to prevent data parsing panics.
- **Recursive Task Resolution Tracker:** Audited hierarchical task deletions ensuring sub-tasks are effectively matched against `materializedPath` tree segments asynchronously when a `PARENT_TASK_DELETED` pulse registers.

## 📁 Key File Modifications
- `src/utils/event-bus/OutboxRelay.ts` [NEW]
- `src/modules/task/internal/TaskQueries.ts` [MODIFIED]
- `src/__tests__/helpers/factories.ts` [MODIFIED]
- `src/__tests__/Idempotency.eda.test.ts` [NEW]
- `src/__tests__/TaskDeleted.eda.test.ts` [NEW]
- `src/__tests__/TaskUpdate.eda.test.ts` [NEW]

---
**Verification Metrics:**  
11 Test Suites, 72 Passing Tests natively on Jest `--runInBand`. Exit Code 0. All async timeouts cleanly aborted with zero pending intervals.
