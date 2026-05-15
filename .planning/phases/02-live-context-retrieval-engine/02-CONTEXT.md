# Phase 02: Live-Context Retrieval Engine - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the retrieval logic that populates the `EvaluationContext`. It acts as the "Glue" between domain services and the Autopilot condition engine.

</domain>

<decisions>
## Implementation Decisions

### Retrieval Strategy
- **Service Integration**: The context resolver MUST use the public service interfaces (e.g., `TaskService`) to fetch data. This ensures domain rules (and potential future read-side optimizations) are respected.
- **No Caching**: V1 will perform live database lookups for every trigger cycle to ensure absolute data freshless.

### Context Building
- **Simple Flattening**: Database result objects will be flattened into `domain:field` keys.
- **Event Merging**: The incoming Kafka/Outbox event payload will be merged into the context. This provides the "diff" or "changed" state necessary for certain condition predicates.

### Performance
- **Non-Blocking**: Data retrieval must be asynchronous and should not block the main event processing thread.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Domain Services
- `modular-monolith/src/modules/task/TaskService.ts` — The interface for task data.
- `modular-monolith/src/modules/autopilot/internal/ConditionEvaluator.ts` — The consumer of this context.

</canonical_refs>

<specifics>
## Specific Ideas
- A `ContextResolverRegistry` could be used to map domain strings (e.g. "task") to their respective service calls.
</specifics>

<deferred>
## Deferred Ideas
- **LRU Caching**: Postponed until performance benchmarks show a bottleneck.
- **Nested Field Support**: Deep path resolution (e.g. `task:links[0].label`) is deferred.
</deferred>

---

*Phase: 02-live-context-retrieval-engine*
*Context gathered: 2026-05-15*
