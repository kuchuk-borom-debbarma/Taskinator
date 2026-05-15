# Phase 03: Condition Evaluation Engine - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the "Neural Loop" of the Autopilot system. It is responsible for intercepting events, finding matching Autopilot definitions, and orchestrating the building of context and evaluation of conditions.

</domain>

<decisions>
## Implementation Decisions

### Execution Pattern
- **Event-Driven Sequentiality**: Autopilots matching a single event should be evaluated sequentially. The engine should support a "continuation" mechanism (likely via event publishing) to process the next matching autopilot without blocking.
- **TraceID Propagation**: A `traceID` MUST be passed through the entire evaluation cycle and included in all logs.

### Matching Logic
- **Database-First Matching**: Use the `triggers` GIN index in PostgreSQL to identify candidate Autopilots for an incoming event.

### Result Logging
- **Persistence of Results**: Both successful (`true`) and skipped (`false`) evaluation results must be recorded. (Note: The actual audit table schema may be deferred to Phase 8, but the engine must be "History Ready" now).

### Isolation
- **Shared Context**: No strict sandboxing or context isolation is required for this version; simplicity is prioritized.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Components
- `modular-monolith/src/modules/autopilot/internal/ContextService.ts` — Fetches data.
- `modular-monolith/src/modules/autopilot/internal/ConditionEvaluator.ts` — Evaluates logic.

</canonical_refs>

<specifics>
## Specific Ideas
- An `AutopilotEngine` service could act as the entry point for all domain events.
</specifics>

<deferred>
## Deferred Ideas
- **Loop Prevention (TraceID Validation)**: The logic to *detect* loops is deferred to Phase 7; Phase 3 only ensures the ID is propagated.
</deferred>

---

*Phase: 03-condition-evaluation-engine*
*Context gathered: 2026-05-15*
