# Milestone v1.1 Roadmap

## Phase 1: Task Domain Bootstrapping
**Goal:** Establish foundational Task entities and baseline CRUD operations.
**Requirements:** TASK-01, TASK-02, TASK-03
**Success Criteria:**
1. Task entity exists in the database with `project_id`, `parent_id`, and `optimistic_lock_version`.
2. GraphQL API allows creating a Task and updating its status.
3. Concurrent updates to the same Task result in an OptimisticLockException.

## Phase 2: SSE Architecture Refactoring
**Goal:** Overhaul the existing SSE mechanism into a highly modular, readable internal component before connecting complex triggers.
**Requirements:** SSE-01, SSE-03
**Success Criteria:**
1. The Redis pub/sub mechanism is encapsulated in a dedicated, isolated module with clean interfaces.
2. Developer telemetry logs clearly trace when a message is published and consumed by the SSE stream.
3. The existing SSE features (from v1.0) continue to work seamlessly through the new refactored component.

## Phase 3: Rules Engine Core
**Goal:** Implement the core Trigger entities, conditions, and actions framework.
**Requirements:** RULE-01, RULE-02, RULE-03, RULE-04
**Success Criteria:**
1. Triggers can be created and stored in the database, scoped to Projects or Teams.
2. The condition evaluator can correctly parse a condition (e.g. "parent task is blocked") and return true/false.
3. The action executor can successfully execute an action (e.g. "update status to ready") when invoked directly in tests.

## Phase 4: Async Execution & Integration
**Goal:** Wire up the rules engine to the Kafka event bus, enabling async execution, chaining, and streaming to SSE.
**Requirements:** EXEC-01, EXEC-02, EXEC-03, EXEC-04, SSE-02
**Success Criteria:**
1. `TaskUpdated` events are published to Kafka via the Outbox pattern.
2. The background executor pool consumes the event and correctly triggers the Rules Engine without blocking the main API thread.
3. Chained triggers safely produce new events (e.g., updating a parent task produces another `TaskUpdated` event).
4. Safety limits correctly catch and abort infinite loops in trigger chaining.
5. All background mutations correctly push SSE updates to the frontend using the refactored SSE component.
