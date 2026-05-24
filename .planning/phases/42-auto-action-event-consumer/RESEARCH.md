# Phase 42 Research: Auto Action Event Consumer

## Existing Patterns

### Listener Pattern

Module listeners are small classes with an `init()` method. They call `eventBus.subscribe(topic, groupId, handlers, { batch: true })`, then delegate the batch to a service method.

Example pattern:
- `TaskAggregated_ReachabilitySyncListener` subscribes to `KAFKA_TOPICS.TASK_AGGREGATED`.
- Handler receives `DomainEvent[]`.
- Handler calls `taskService.handleTaskReachabilitySync(events)`.

### Registry Pattern

`modular-monolith/src/kafka/registry.ts` creates each consumer/listener class and awaits all `init()` calls in `Promise.all`.

Phase 42 should add the auto-action consumer there without changing existing consumers.

### Auto Action Service Pattern

Public interface:
- `AutoActionService.ts`

Implementation:
- `internal/service/AutoActionServiceImpl.ts`

Internal DB boundary:
- `internal/queries/AutoActionQueries.ts`

Current service already supports create/update/delete/list/get/template/execute pipeline. Runtime trigger methods are missing.

### Executor Boundary Issue

`executeAutoActionPipeline` currently imports `db` and selects `auto_action` directly. This violates v15 service-layer direction and Phase 42 service-boundary goal.

Plan should move that DB read into `AutoActionQueries` and/or service-owned wrapper before wiring consumer.

## Recommended Design

### Thin Consumer

Create `AutoActionTaskEventConsumer`:
- subscribes to `KAFKA_TOPICS.TASK`
- handles `task.created`, `task.updated`, maybe `task.deleted` only if supported by registered triggers
- delegates `DomainEvent[]` to `autoActionService.handleTaskEvents(events)`
- no query imports
- no engine imports

### Service Functions

Add to `AutoActionService`:
- `handleTaskEvents(events: DomainEvent[]): Promise<void>`
- optionally `triggerForEvent(event: DomainEvent): Promise<void>` if simpler to test

Implementation responsibilities:
- validate/normalize supported events
- derive project ID, task ID, actor ID, trace ID, wasSnapshot
- find active auto actions for trigger/project/scope
- execute matching pipelines through existing pipeline executor
- log skipped unsupported/malformed events

### Queries

Add internal query functions:
- `selectActiveAutoActionsForTrigger(projectId, triggerType, scope)`
- `selectAutoActionForExecution(id)` if executor still needs a direct fetch abstraction

Trigger matching likely reads JSON `triggers`; keep query simple and readable. Prefer DB-side filtering only where existing schema supports it cleanly. KISS: project + active + optional scope in SQL, trigger filtering in service if JSON shape is awkward.

### Idempotency / Trace / Depth

Event bus already uses Kafka consumer groups for delivery semantics. For Phase 42:
- preserve `event.eventId` as default trace ID if no trace metadata exists
- pass event snapshots into `wasSnapshot`
- preserve existing depth fields if present in event payload
- do not invent new outbox recursion protocol unless needed for runtime correctness

## Risks

- Trigger JSON shape may vary from earlier UI/compiler work. Plan must inspect stored/expected shape before final query/filter code.
- `task.deleted` may not have enough fresh context to execute normal task actions. Start with created/updated unless deletion trigger has existing schema support.
- Running pipelines directly inside Kafka batch can make slow actions block consumer batches. Existing sync safety helps, but tests should confirm sync-only behavior for supported triggers.

## Verification Targets

- Consumer delegates to service for task events.
- Service selects eligible active rules and executes pipeline for each match.
- Unsupported events or missing IDs are skipped with logging.
- Executor no longer imports `db`.
- Focused tests cover service trigger method and consumer delegation.
