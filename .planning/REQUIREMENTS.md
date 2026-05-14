# Milestone v1.1 Requirements

## Task Domain Bootstrapping (TASK)
- [ ] **TASK-01**: Establish foundational Task entity with required fields (ID, title, status, project_id, parent_id, optimistic_lock_version).
- [ ] **TASK-02**: Implement standard repository with Optimistic Locking support.
- [ ] **TASK-03**: Expose basic GraphQL mutations for Task creation and status updates.

## Rules Engine Core (RULE)
- [ ] **RULE-01**: Create Trigger configuration entity linking an Event (e.g. `Task.Completed`), Condition, and Action.
- [ ] **RULE-02**: Support trigger scoping (Project-level or Team-level only, no global triggers).
- [ ] **RULE-03**: Implement condition evaluator service (e.g. checking if parent is blocked).
- [ ] **RULE-04**: Implement action executor service (e.g. modifying related entities).

## Async Execution (EXEC)
- [ ] **EXEC-01**: Publish primary domain events (e.g. `TaskCreated`, `TaskUpdated`) to Kafka using the existing Outbox pattern.
- [ ] **EXEC-02**: Consume events in a background executor pool that triggers the Rules Engine.
- [ ] **EXEC-03**: Support Trigger Chaining — allow triggers to mutate data, producing new events, with safety limits against infinite loops.
- [ ] **EXEC-04**: Ensure all trigger execution is non-blocking to the main API threads.

## Real-Time SSE Refactoring (SSE)
- [ ] **SSE-01**: Refactor existing Redis pub/sub mechanism into a cleaner, highly modular, readable, and refactorable internal component.
- [ ] **SSE-02**: Ensure background triggered updates correctly stream back to subscribed GraphQL WebSocket/SSE clients.
- [ ] **SSE-03**: Add clear developer telemetry/logging to easily track events from API → Kafka → Trigger → SSE UI.

## Out of Scope
- A visual frontend UI for configuring these triggers (this milestone focuses on the backend engine and APIs).
- Cross-microservice triggers (only Workspace service entities for now).

## Traceability
- **Phase 1:** TASK-01, TASK-02, TASK-03
- **Phase 2:** SSE-01, SSE-03
- **Phase 3:** RULE-01, RULE-02, RULE-03, RULE-04
- **Phase 4:** EXEC-01, EXEC-02, EXEC-03, EXEC-04, SSE-02
