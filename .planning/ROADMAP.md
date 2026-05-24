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

---

## Phase 56: Search Module (v1.1)

Cross-entity search, task filtering, and sorting across the platform.

- [ ] **Global search bar** (⌘K / Ctrl+K) — search tasks, teams, and members
      in one query, grouped by entity type, keyboard-navigable.
- [ ] **Task filtering** — filter by status, assignee, team, priority, date range,
      and any combination; URL-persisted so filters are shareable.
- [ ] **Task sorting** — sort by priority, dates, status, assignee; multi-column
      sort with correct cursor-pagination continuity.
- [ ] **Member & team search** — find members within a team or project-wide;
      filter the teams list by name or member count.
- [ ] **Backend search API** — PostgreSQL full-text search via `tsvector` /
      `tsquery` with indexed `search_vector` column on `project_task`, `project_member`,
      and `team`; `ILIKE` fallback for MVP.
- [ ] **Pagination continuity** — filtered and sorted queries paginate correctly
      without N+1 or count-explosion issues.
