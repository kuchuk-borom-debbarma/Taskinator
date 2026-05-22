# Milestones

## v15.0 Service Layer Isolation (Shipped: 2026-05-22)

**Phases completed:** 3 phases, 9 plans, 20 tasks

**Key accomplishments:**

- Generic AggregatorService now owns atomic claim-fold-outbox processing, with ProjectEvents_BatchAggregator refactored onto the shared service.
- Task and Team smart aggregators now share AggregatorService for atomic batch processing while preserving their domain-specific folding logic.
- AuthService now handles aggregated user project count synchronization behind the service boundary, with the Kafka listener reduced to delegation.
- ProjectService now owns project aggregate listener writes for counts and memberships, with project listeners reduced to service delegation.
- TeamService now owns team aggregate listener writes for counts, project-driven purges, and team membership purges, with team listeners reduced to service delegation.
- TaskService now owns task graph listener writes for reachability sync, task link cleanup, and chunked reachability cleanup.
- TaskService now owns the remaining task cleanup and assignment listener writes, completing task module listener delegation.
- Phase 40 is closed as an audit-backed gap closure: module listeners have no direct database, raw SQL, or query-builder mutation usage and delegate event batches to module services.
- Phase 41 is closed as an audit-backed gap closure: listener write paths delegate to module services, with transaction/idempotency ownership kept inside services.

---

## v14.0 Hide Internal Engines (Shipped: 2026-05-21)

**Phases completed:** 1 phase, 1 plan, 7 tasks

**Key accomplishments:**

- **Dynamic Database Context Resolver Registry**: Designed a generic resolver structure to fetch database entities for any scope and built the central `ContextResolverRegistry`.
- **Advanced Snapshot Merging**: Implemented dynamic wasSnapshot overlays in `scopes/task/context.ts` mapping and normalizing snake_case, camelCase GraphQL aliases, and explicit keys.
- **Strict Zod Type-Safety**: Leveraged schema validation checks via Zod to enforce runtime type compliance prior to AST condition check evaluation.
- **Robust Test Coverage**: Wrote 10 comprehensive tests in `__tests__/contextEngine.test.ts` achieving 100% pass rate.

---

## v10.0 Action & Condition Engine Isolation (Shipped: 2026-05-21)

**Phases completed:** 1 phase, 1 plan, 7 tasks

**Key accomplishments:**

- **Decoupled Engines Implementation**: Created `conditionEngine.ts` and `actionEngine.ts` to manage stateless AST evaluation and validation-backed action execution completely independently.
- **Optimistic Concurrency & OCC**: Integrated fresh-fetching and optimistic concurrency locking guarantees inside action execution flows.
- **Decoupled Testing**: Rewrote the entire module unit tests to fully assert separate engines independently, with 23/23 tests passing.

---

## v9.0 Auto-Action Condition Component (Shipped: 2026-05-21)

**Phases completed:** 3 phases, 3 plans, 3 tasks

**Key accomplishments:**

- **Transition-Focused Condition Nodes**: Replaced generic comparison operators with 10 strict, transition-focused predicates (`TaskFieldChangedTo`, `TaskTeamAssigned`, etc.) ensuring robust event trigger checking.
- **Dynamic Condition Registry**: Created a registerable `ConditionDefinition` interface to support dynamic, multi-scope trigger, action, and condition registration.
- **Decoupled Template Serialization**: Extracted all frontend template compilation into an isolated `template.ts` module, completely eliminating circular dependencies between the global registry and task schemas.

---

## v8.0 High-Performance CTE & Depth Guards (Shipped: 2026-05-17)

**Phases completed:** 2 phases, 4 plans, 6 tasks

**Key accomplishments:**

- **CTE Bulk Outbox Writes**: Enabled single-query heterogeneous updates and outbox writing inside a single database transaction, optimized for 10k RPS.
- **Asynchronous Depth Guards**: Integrated TraceId + depth propagation across recursive event flows and Kafka listeners, blocking loop execution with a strict maximum boundary of 50 depth hops.

---

## v7.0 v7.0 (Shipped: 2026-05-17)

**Phases completed:** 7 phases, 16 plans, 3 tasks

**Key accomplishments:**

- 1. [Rule 3 - Blocking Issue] Missing AutopilotTable update
- 27-01: Context & Serializers
- 1. [Rule 1 - Bug] Fixed failing PipelineEditor test
- Refactored Autopilot creation wizard for sequential flow, integrated context-locked editors, and fixed pipeline serialization tests.

---

## v7.0 v7.0 (Shipped: 2026-05-16)

**Phases completed:** 7 phases, 16 plans, 3 tasks

**Key accomplishments:**

- 1. [Rule 3 - Blocking Issue] Missing AutopilotTable update
- 27-01: Context & Serializers
- 1. [Rule 1 - Bug] Fixed failing PipelineEditor test
- Refactored Autopilot creation wizard for sequential flow, integrated context-locked editors, and fixed pipeline serialization tests.

---

## v5.0 Revamp Autopilot (Shipped: 2026-05-16)

**Phases completed:** 1 phases, 1 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---
