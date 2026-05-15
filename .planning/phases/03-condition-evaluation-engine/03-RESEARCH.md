# Phase 03: Condition Evaluation Engine - Research

**Date:** 2026-05-15
**Phase Goal:** Implement the loop that orchestrates context building and condition matching.

## Technical Findings

### 1. Trigger Matching (PostgreSQL GIN)
The `autopilot` table has a `triggers` array column with a GIN index. To find matching autopilots for an event type (e.g. `task.updated`), we will use the `ANY` operator.

**Kysely Query:**
```typescript
const autopilots = await db.selectFrom('autopilot')
    .selectAll()
    .where('is_active', '=', true)
    .where(sql<boolean>`${eventType} = ANY(triggers)`)
    .execute();
```

### 2. Sequential Execution (Chain Reaction)
The user requested sequential evaluation via an event-driven pattern. We will implement an `AutopilotEngine` that processes a list of Autopilots for a given event.

**Proposed Flow:**
1. Event arrives (e.g. `TASK_UPDATED`).
2. Engine fetches all matching Autopilots.
3. Engine processes them one by one.
4. To ensure traceability and non-blocking behavior, the engine can publish a internal `AUTOPILOT_EVALUATE` event for each matching definition.

### 3. TraceID Propagation
The `traceID` must be extracted from the incoming domain event (if available) or generated at the start of the evaluation cycle. This ID will be passed into the `EvaluationContext` and eventually into the audit logs.

### 4. Integration with Event Bus
The Autopilot system will act as a subscriber to the main `eventBus`. 
- **Topic**: `task-events`, `project-events`.
- **Consumer Group**: `autopilot-engine`.

## Implementation Strategy
1. Create `AutopilotEngine.ts`: The core logic for matching and orchestrating evaluation.
2. Create `AutopilotSubscriber.ts`: Subscribes to domain events and routes them to the engine.
3. Update `AutopilotModule.ts` to start the subscriber on bootstrap.

## Verification Plan
- **Unit Tests**: Mock `ContextService` and `ConditionEvaluator` to verify the engine correctly iterates through multiple autopilots.
- **Integration Tests**: Publish a dummy event to `MemoryBus` and verify that the `AutopilotEngine` is triggered and performs a DB lookup.
