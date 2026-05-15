# Milestone v1.2: Project Autopilot System

## Phase 1: Core Foundation & Condition Engine
**Goal:** Build the generic data model and the live-context condition evaluator.
**Success Criteria:**
1. Autopilot and Condition schemas are implemented in the database.
2. The `ConditionEvaluator` can resolve complex trees (AND/OR/NOT) against fresh DB state.
3. Tests verify that mismatched conditions correctly block autopilot execution.

## Phase 2: Action Chaining & Async Execution
**Goal:** Implement the sequential action engine and connect it to the Kafka event bus.
**Success Criteria:**
1. Action Chain runner executes linked actions in strict sequence.
2. The "Fail-Fast" policy correctly halts execution upon any step failure.
3. Task mutations (Status, Assignment) are successfully triggered by incoming domain events.

## Phase 3: Loop Detection & Real-time Audit
**Goal:** Implement safety mechanisms and UI observability.
**Success Criteria:**
1. TraceID + Mutation Hash correctly detects and breaks infinite loops in stress tests.
2. All executions are recorded in the persistent `autopilot_audit_log`.
3. Audit logs are pushed to the SSE stream and visible to the client in real-time.

---
*Roadmap defined: 2026-05-15*
*Last updated: 2026-05-15 after initialization*
