# Phase 03: Condition Evaluation Engine - Plan

**Goal:** Implement the loop that orchestrates context building and condition matching.

## Proposed Changes

### Autopilot Module (Internal)
#### [NEW] [AutopilotEngine.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/AutopilotEngine.ts)
- Implement `AutopilotEngine` class.
- Method `processEvent(eventType, payload, traceId)`:
  - Fetch active autopilots from DB matching `eventType`.
  - Loop through them:
    - Build context using `ContextService`.
    - Evaluate conditions using `ConditionEvaluator`.
    - If true, log success and trigger actions (Actions logic deferred to Phase 4).
    - If false, log skip.

#### [NEW] [AutopilotSubscriber.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/AutopilotSubscriber.ts)
- Initialize subscription to `task-events` and `project-events` topics.
- Route events to `AutopilotEngine.processEvent`.

### Bootstrap
#### [MODIFY] [Autopilot index.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/index.ts)
- Export `AutopilotEngine` and `AutopilotSubscriber`.
- Initialize subscriber in an `init()` method.

## Task List
- [ ] Implement `AutopilotEngine.ts` with DB matching logic
- [ ] Integrate `ContextService` and `ConditionEvaluator` into the engine
- [ ] Implement `AutopilotSubscriber.ts` for event listening
- [ ] Wire up everything in `Autopilot index.ts`
- [ ] Create unit tests for `AutopilotEngine` (Loop logic)
- [ ] Create integration test with `MemoryBus`

## Verification Plan

### Automated Tests
- `npm test src/modules/autopilot/internal/AutopilotEngine.test.ts`
- `npm test src/modules/autopilot/internal/AutopilotIntegration.test.ts`

### Manual Verification
- Manually trigger a task update in a debug script and verify that the Autopilot engine picks up the event and logs the evaluation result.
