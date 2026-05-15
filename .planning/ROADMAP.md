# Milestone v1.2: Project Autopilot System

## Phase 1: Autopilot & Condition Schema [DONE]
**Goal:** Define and implement the database schema for Autopilots and their logical conditions.
**Success Criteria:**
1. `autopilot` and `autopilot_condition` tables are created in PostgreSQL.
2. Models/Repositories are established with basic CRUD for autopilot definitions.

## Phase 2: Live-Context Retrieval Engine [DONE]
**Goal:** Build the mechanism to fetch "fresh" domain state from the DB for condition evaluation.
**Success Criteria:**
1. Context resolver can fetch Task and Project state by ID on demand.
2. Context objects are typed and ready for the evaluation engine.

## Phase 3: Condition Evaluation Engine
**Goal:** Implement the Boolean logic tree (AND/OR/NOT) for matching autopilots to events.
**Success Criteria:**
1. Engine correctly evaluates complex logical trees against context.
2. Unit tests cover all V1 predicates (`Equals`, `Changed`, `HasParent`, etc.).

## Phase 4: Action Chain Framework
**Goal:** Implement the data model and structural runner for sequential actions.
**Success Criteria:**
1. `autopilot_action` table and Linked List structure are implemented.
2. The Action Runner correctly manages step execution and failure propagation.

## Phase 5: Core Task Action Handlers
**Goal:** Implement the executable code for specific task-level mutations.
**Success Criteria:**
1. `StatusUpdate` and `MemberAssignment` actions are implemented and tested.
2. Atomic database writes are verified for each action type.

## Phase 6: Async Event Router & Kafka Integration
**Goal:** Connect the system to the Kafka outbox for reactive, non-blocking execution.
**Success Criteria:**
1. Kafka consumer correctly routes domain events to the Autopilot dispatcher.
2. Events are processed asynchronously without impacting the main API flow.

## Phase 7: TraceID & Loop Detection
**Goal:** Implement the safety layer to prevent infinite automation cycles.
**Success Criteria:**
1. TraceID is successfully propagated through action-triggered events.
2. Mutation-Hash based detection identifies and terminates redundant loops.

## Phase 8: Audit Logging & SSE Observability
**Goal:** Finalize the system with persistent logging and real-time UI updates.
**Success Criteria:**
1. `autopilot_audit_log` records every step of every execution.
2. Logs are successfully broadcasted via SSE for real-time UI monitoring.

---
*Roadmap defined: 2026-05-15*
*Last updated: 2026-05-15 after granular split*
