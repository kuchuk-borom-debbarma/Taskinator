# Phase 42: Auto Action Event Consumer - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning
**Source:** User milestone request + codebase pattern scan

<domain>
## Phase Boundary

Connect domain events to auto-action rule lookup and execution through service boundaries.

This phase covers runtime consumer wiring only. GraphQL query/mutation, connection pagination, and DataLoader are Phase 43.
</domain>

<decisions>
## Implementation Decisions

### Architecture
- Keep code modular, simple, loosely coupled, well organized, and easy to follow.
- Apply SOLID where it helps readability and boundaries.
- Prefer KISS over abstraction-heavy design.
- Consumer stays thin: subscribe, receive events, delegate to service.
- Auto-action service owns rule lookup and pipeline trigger orchestration.
- Query functions stay internal to `auto-action/internal/queries`.
- Internal engines remain hidden behind service functions.

### Runtime Scope
- Support initial task event trigger flow using existing `TASK` scope.
- Subscribe to existing `KAFKA_TOPICS.TASK` events where task auto-action triggers are defined.
- Preserve event trace/depth metadata when available and fall back to safe defaults.
- Keep failure visible through logger and consumer failure semantics.

### Service Boundary
- Add service functions for event-driven trigger handling.
- Add internal query functions for selecting active auto actions by trigger/scope/project.
- Remove direct DB read from `executeAutoActionPipeline`; route through query/service-owned boundary.

### Testing
- Use focused unit tests around service trigger behavior and listener delegation.
- Mock query/engine boundaries where possible to keep tests fast.
- Verify no consumer imports internal queries or engines.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/REQUIREMENTS.md` — v16 runtime requirements and traceability.
- `.planning/ROADMAP.md` — Phase 42 goal and success criteria.

### Auto Action Module
- `modular-monolith/src/modules/auto-action/AutoActionService.ts` — public service interface.
- `modular-monolith/src/modules/auto-action/internal/service/AutoActionServiceImpl.ts` — service implementation pattern.
- `modular-monolith/src/modules/auto-action/internal/queries/AutoActionQueries.ts` — internal DB query boundary.
- `modular-monolith/src/modules/auto-action/internal/execution/executor.ts` — current pipeline executor.
- `modular-monolith/src/modules/auto-action/types.ts` — scopes, pipeline, condition/action types.
- `modular-monolith/src/modules/auto-action/scopes/task/context.ts` — task context resolver behavior.

### Event Bus / Consumer Patterns
- `modular-monolith/src/utils/event-bus/types.ts` — `DomainEvent` and `Bus.subscribe` contracts.
- `modular-monolith/src/utils/event-bus/constants.ts` — topics and event type constants.
- `modular-monolith/src/kafka/registry.ts` — consumer registration lifecycle.
- `modular-monolith/src/modules/task/internal/listeners/TaskAggregated_ReachabilitySyncListener.ts` — thin listener + service delegation pattern.
- `modular-monolith/src/kafka/smart-aggregator-consumer/task/TaskEvents_BatchAggregator.ts` — task event payload patterns.
</canonical_refs>

<specifics>
## Specific Ideas

- Add `AutoActionTaskEventConsumer` under `modules/auto-action/internal/listeners/`.
- Add `handleDomainEvents(events)` or narrower task-specific service method to `AutoActionService`.
- Add `selectActiveAutoActionsForTrigger(projectId, triggerType, scope)` query.
- Add `selectAutoActionForExecution(id)` query or reuse `selectAutoActionById` via service boundary so executor does not import `db`.
- Use consumer group like `auto-action-task-trigger-group`.
- Subscribe in `kafka/registry.ts` after auto-action module initialization is already handled by app startup.
</specifics>

<deferred>
## Deferred Ideas

- GraphQL API, connection pagination, and DataLoader move to Phase 43.
- Cross-scope/domain auto-actions beyond task scope move to future requirements unless trivial extension falls out naturally.
- Rich execution history UI/API is out of scope.
</deferred>

---

*Phase: 42-auto-action-event-consumer*
*Context gathered: 2026-05-22*
