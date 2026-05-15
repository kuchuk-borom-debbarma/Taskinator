# Phase 04: Action Execution Pipeline - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the "Execution Arm" of the Autopilot system. It is responsible for defining, storing, and running the sequence of actions that occur when an Autopilot's conditions are met.

</domain>

<decisions>
## Implementation Decisions

### Action Storage
- **Ordered Table**: Use a separate table `autopilot_action` with a `position` column for ordering.
- **FK Reference**: `fk_autopilot_id` links actions to their parent definition.

### Execution Strategy
- **Sequential Fail-Fast**: Actions execute one by one in the order of their `position`. If one fails, the entire chain terminates.
- **TraceID Propagation**: The `traceId` generated/passed by the `AutopilotEngine` MUST be passed into every action handler.
- **Targeting**: V1 is restricted to `SELF` (the entity that triggered the event). No hierarchical propagation yet.

### Core Action Handlers (V1)
- `task.update_status`: Sets the `status` field.
- `task.assign_team`: Sets the `teamId` field.
- `task.assign_member`: Sets the `memberId` field.
- `task.update_priority`: Sets the `priority` field.

</decisions>

<canonical_refs>
## Canonical References
- `modular-monolith/src/modules/autopilot/internal/AutopilotEngine.ts` — Triggers the `ActionRunner`.
- `modular-monolith/src/modules/task/TaskService.ts` — Primary interface for task mutations.

</canonical_refs>
