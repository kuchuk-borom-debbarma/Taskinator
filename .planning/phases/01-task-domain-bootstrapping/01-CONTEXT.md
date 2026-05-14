# Phase 1 Context: Task Domain Bootstrapping

**Domain:** Establishing the foundational Task entities and making sure they are ready to emit and track events for the Rules Engine.

## Locked Decisions

### Architecture & Boundaries
- **Task Entity Completion:** The core CRUD, Optimistic Locking, and Kafka Outbox integration already exist in `modular-monolith/src/modules/task/`.
- **Decoupled Triggers:** Tasks do NOT need to be aware of triggers. Triggers are defined at the Project level, and the Rule Engine evaluates them blindly based on conditions.
- **Freeform Status:** The `status` field remains a freeform string to allow clients to define custom transitions. We will not enforce a strict state machine.

### Audit & Observability
- **Execution Audit Log:** Introduce an Audit Log table/mechanism in the Task domain to record *why* a task was modified (e.g., "Updated by Trigger X").
- **Correlation IDs:** Every event and subsequent trigger action MUST carry a Correlation ID so the full lifecycle of a chained trigger can be traced from start to finish.

## Canonical References
- `modular-monolith/src/modules/task/TaskService.ts`
- `.planning/codebase/ARCHITECTURE.md`

## Code Context
- Use existing `OutboxRelay` and `BatchAggregator` patterns for publishing the audit logs.
- The project is built on Node.js/Bun, Kysely, and GraphQL Yoga.
