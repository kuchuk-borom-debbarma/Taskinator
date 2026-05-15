# Milestone v1.2: Project Autopilot System

## Phase 1: Core Foundation & Condition Engine
**Goal:** Build the generic autopilot data model and the "Live-Context" condition evaluator.
**Success Criteria:**
1. Autopilot and Condition schemas are implemented in the database.
2. The `ConditionEvaluator` can resolve complex trees (AND/OR/NOT) against fresh DB state.
3. Unit tests verify that conditions correctly pass/fail based on mock domain contexts.

## Phase 2: Action Chain Framework
**Goal:** Implement the sequential action model and the "Fail-Fast" chain runner.
**Success Criteria:**
1. The `ActionChain` data model (Linked List) is implemented.
2. The execution engine can run a sequence of actions and correctly halt on any step failure.
3. Core task actions (Status update, Assignment) are implemented as executable units.

## Phase 3: Async Execution & Event Integration
**Goal:** Connect the Autopilot engine to the Kafka event bus for reactive execution.
**Success Criteria:**
1. Incoming domain events correctly trigger the corresponding Autopilot lookup and evaluation.
2. The engine executes action chains asynchronously without blocking the primary event loop.
3. Initial integration tests verify an end-to-end flow: Event → Condition → Action.

## Phase 4: Safety, Loop Detection & Audit
**Goal:** Implement TraceID-based loop detection and real-time execution logging.
**Success Criteria:**
1. Mutation-Hash based loop detection correctly breaks infinite cycles.
2. Every autopilot execution is recorded in the `autopilot_audit_log`.
3. Audit logs are pushed to the SSE stream and visible in real-time.

---
*Roadmap defined: 2026-05-15*
*Last updated: 2026-05-15 after phase separation*
