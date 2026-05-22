# Roadmap: v20.0 - Advanced Automation Intelligence

## Phase 51: Recursive Context Resolution
- [ ] Update `ContextEngine` to support resolving related entities (parent/children).
- [ ] Implement lazy-loading for related entity contexts to minimize initial payload.
- [ ] Add depth limits to prevent circular dependency resolution.

## Phase 52: Path-based Predicate AST & Evaluator
- [ ] Refactor `ConditionNode` to support dot-notation paths in field selection.
- [ ] Update `evaluateCondition` to handle path traversal across resolved contexts.
- [ ] Implement aggregation functions (`count`, `sum`, `every`, `some`) for child collections.

## Phase 53: Multi-domain Trigger Registry & Dispatcher
- [ ] Implement a global trigger index in the database or an efficient lookup mechanism for cross-project events.
- [ ] Update `AutoActionService` to dispatch events to all matching rules, regardless of project ID.
- [ ] Refine authorization logic for cross-project action execution.

## Phase 54: UI Support for Advanced Intelligence
- [ ] Update `ui-v1` Visual Builder to allow selecting fields from related entities.
- [ ] Implement UI for aggregation condition configuration.
- [ ] Add "Trigger Source" selection in the creation wizard (Current Project vs. All Projects).

## Phase 55: E2E Validation & Performance Benchmarking
- [ ] Add integration tests for recursive parent-child conditions.
- [ ] Validate cross-project trigger latency and reliability.
- [ ] Perform stress testing on complex predicate trees to ensure stability.
