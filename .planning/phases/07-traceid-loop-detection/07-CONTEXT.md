# Phase 07 Context: TraceID & Loop Detection

## Decisions Locked
- **Mechanism**: Use **Trace Depth Limit**.
- **Format**: `rootTraceId:depth` (e.g., `abc-123:1`).
- **Default Limit**: 10 hops.
- **On Violation**: Stop execution and log a high-priority warning.
- **Actor Identification**: Ensure `system:autopilot` mutations correctly pass the incremented `traceId` to the `outbox_events` table.

## Implementation Scope
- [MODIFY] `AutopilotEngine`: Add logic to parse `traceId` for depth, check against limit, and increment for the next hop.
- [MODIFY] `ActionRunner`: Pass the incremented `traceId` to the handlers.
- [MODIFY] `ActionHandlers`: Pass the `traceId` to `taskService.updateTask`.
- [MODIFY] `TaskQueries.ts`: Ensure `updateTask` accepts `traceId` and inserts it into `outbox_events` payload.

## Next Steps
- Create Implementation Plan.
- Verify end-to-end with a "Looping" test case.
