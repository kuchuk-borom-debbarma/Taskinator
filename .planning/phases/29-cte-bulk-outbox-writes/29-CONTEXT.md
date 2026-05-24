# Phase 29: CTE Bulk Outbox Writes - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the Autopilot write path in `SmartAggregator.ts` to transactionally write outbox events (`task.updated`, etc.) to the `outbox_events` table under a single, highly performant PostgreSQL Common Table Expression (CTE) query. This will propagate automated state mutations downstream (triggering real-time SSE updates and search syncs) while maintaining strict asynchronous loop depth limits.

</domain>

<decisions>
## Implementation Decisions

### Scope of CTE Outbox Generation
- **D-01 (Dynamic Table-Agnostic CTEs)**: The `SmartAggregator` must programmatically compile dynamic CTE queries for all entity types (e.g. `project_task`, `project_team`, `project_project`) to select the `old_state`, perform CASE-statement bulk updates, and execute `INSERT INTO outbox_events` in exactly **one single round-trip database query**. It must not be hardcoded to `project_task` only.

### Missing/Malformed Trace Headers
- **D-02 (Strict Fail-Safe with Logs)**: Pushing mutation items to the aggregator without a valid `traceId` or `depth` is strictly prohibited. The aggregator must immediately throw a validation exception and reject the write to prevent untraced mutations from entering the pipeline, and output detailed warning logs carrying exact entity and table identifiers.

### Recovery Buffer Merging Precedence
- **D-03 (Keep Oldest Trace)**: When recovering from a failed bulk update and restoring items to the buffer, if older buffered updates clash with newly incoming mutations for the same entity, the **original/oldest `traceId` and `depth`** must take precedence. This preserves loop depth consistency and prevents artificially triggering loop limits due to retries.

### Operator Discretion
- The exact formatting of error logging statements for un-traced mutations.
- The precise dialect casing syntax and key serialization mappings for generic entity types in dynamic CTE generation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Specifications
- `.planning/REQUIREMENTS.md` — Scoped requirements for this milestone (includes CTE-01 through CTE-03).

### Autopilot Architecture
- `docs/AUTOPILOT-ARCHITECTURE.md` §5.3 — Proposed single-query bulk CTE transaction updates.
- `docs/AUTOPILOT-ARCHITECTURE.md` §6 — Loop cascade safety and depth limits.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [SmartAggregator.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/orchestrator/SmartAggregator.ts) §executeBulkUpdate — Pre-existing bulk CASE statements and hardcoded CTE query structures that can be refactored into the dynamic table-agnostic query generator.

### Established Patterns
- Outbox queries in [OutboxQueries.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/utils/event-bus/OutboxQueries.ts) and [TaskQueries.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/task/internal/TaskQueries.ts) demonstrate standard postgres outbox columns and JSONB payload builders.

### Integration Points
- `SmartAggregator.executeBulkUpdate` is invoked directly during the batch flush segment, running updates within active database transactions.

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-cte-bulk-outbox-writes*
*Context gathered: 2026-05-17*
