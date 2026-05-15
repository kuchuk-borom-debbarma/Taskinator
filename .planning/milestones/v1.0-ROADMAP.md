# Roadmap - Project Autopilot

## Phase 1: Foundation & Condition Schema
- [x] AUTO-01: Implement the core `ConditionNode` and `Predicate` types.
- [x] AUTO-03: Create the validation logic for condition trees.

## Phase 2: Engine Context Service
- [x] AUTO-03: Implement `ContextService` to hydrate evaluation context from DB and events.

## Phase 3: Boolean Logic Evaluator
- [x] AUTO-04: Implement the recursive `ConditionEvaluator` (AND/OR/NOT).

## Phase 4: Action Runner & Linked List
- [x] EXEC-01: Implement `autopilot_action` table and positional runner.
- [x] EXEC-02: Implement failure propagation (stop on error).

## Phase 5: Core Task Action Handlers
- [x] EXEC-03: Implement `StatusUpdate`, `AssignTeam`, `AssignMember`, etc.

## Phase 6: Async Event Router & Kafka Integration
- [x] AUTO-02: Implement `AutopilotDispatcher` and register in global consumer registry.

## Phase 7: TraceID & Loop Detection
- [x] SAFE-01: Implement `Max Depth` loop detection and traceId propagation.

- [x] Phase 08: Audit Logging & Observability

## Phase 9: Advanced Features (Future)
- [ ] Multi-domain triggers (e.g., Project update triggers Task update).
- [ ] Complex condition predicates (e.g., "Parent task status is Done").
- [ ] UI for managing autopilots.
