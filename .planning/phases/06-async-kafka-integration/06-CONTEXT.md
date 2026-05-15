# Phase 06 Context: Async Event Router & Kafka Integration

## Decisions Locked
- **Consumer Pattern**: Use **Option A**. Create a dedicated `AutopilotConsumer` in `src/kafka/registry.ts`.
- **Dispatcher Pattern**: Implement a central `AutopilotDispatcher` that listens to multiple topics and routes events to the `AutopilotEngine` after filtering for active triggers.
- **Error Handling**: No Dead Letter Queue (DLQ) for v1. Use "Best Effort" execution — log failures and move to the next event.
- **Traceability**: Extract `traceId` from Kafka headers and pass it down the pipeline.

## Implementation Scope
- [NEW] `AutopilotDispatcher`: Responsible for subscribing to `task-events`, `project-events`, etc., and invoking the engine.
- [MODIFY] `src/kafka/registry.ts`: Register and initialize the `AutopilotDispatcher`.
- [MODIFY] `AutopilotEngine`: Ensure it's optimized for concurrent event processing if needed (though we'll keep it sequential for now per prior discussion).
- [MODIFY] `KafkaBus.ts`: Ensure it correctly exposes headers to consumers.

## Next Steps
- Research `KafkaBus.ts` header handling.
- Create Implementation Plan.
