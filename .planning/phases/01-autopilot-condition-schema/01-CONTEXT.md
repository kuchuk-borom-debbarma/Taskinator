# Phase 01: Autopilot & Condition Schema - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase establishes the persistent storage layer for the Project Autopilot system. It includes the database schema for Autopilot definitions and their associated condition logic.

</domain>

<decisions>
## Implementation Decisions

### Data Storage
- **JSONB Conditions**: All logical conditions (AND/OR/NOT trees) will be stored in a single `JSONB` column on the `autopilot` table.
- **Multi-Event Triggers**: The `triggers` field will be a `string[]` allowing one Autopilot to respond to multiple domain event types (e.g., `TASK_CREATED` and `TASK_UPDATED`).

### Extensibility
- **Domain-Agnostic Fields**: Conditions will specify fields using a `{domain}:{field}` string pattern. This ensures the schema remains stable even as we add Team, Project, or Member-level conditions in future phases.

### Performance & Safety
- **Live-Context**: The schema must support efficient lookups by `projectId`, but the engine will retrieve fresh DB state during evaluation to ensure accuracy.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Patterns
- `modular-monolith/src/database/tables/ProjectTask.ts` — Example of Kysely table definition.
- `modular-monolith/src/database/tables/OutboxEvent.ts` — Existing event structure.

</canonical_refs>

<specifics>
## Specific Ideas
- The `autopilot` table should include `is_active` (boolean) and `trace_history_enabled` (boolean) flags for debugging.
</specifics>

<deferred>
## Deferred Ideas
- **Action Chaining**: The `autopilot_action` table and linked-list logic will be implemented in Phase 2.
- **Audit Logging**: The `autopilot_audit_log` table will be implemented in Phase 4.
</deferred>

---

*Phase: 01-autopilot-condition-schema*
*Context gathered: 2026-05-15*
