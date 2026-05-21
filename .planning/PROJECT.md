# Taskinator — Project Autopilot System

## What This Is

A high-performance, data-driven automation engine for the Taskinator-v2 workflow platform. It enables projects to self-manage by executing complex, multi-step actions in response to domain events without manual intervention.

## Core Value

Automate the "busy work" of project management through reliable, transparent, and high-speed execution chains.

## Requirements

### Validated

- ✓ [Autopilot Core Engine] — Generic, data-driven execution framework (v1.0).
- ✓ [Context-Aware Condition Evaluator] — Live-DB evaluation with Boolean logic (AND/OR/NOT) (v1.0).
- ✓ [Ordered Action Chaining] — Linked-list execution model with "fail-fast" atomicity (v1.0).
- ✓ [Loop Detection] — TraceID + Depth based infinite cycle prevention (v1.0).
- ✓ [Audit Logging] — Real-time execution logs for UI visibility (v1.0).
- ✓ [Autopilot Dashboard] — List view for all autopilots in a project with status and metadata (v2.0).
- ✓ [Visual Condition Builder] — Node-based interface (using XYFlow) for defining condition trees (v2.0).
- ✓ [Action Pipeline Editor] — Drag-and-drop or sequential list editor for automation steps (v2.0).
- ✓ [Dynamic Action Config] — Smart forms with predefined dropdowns and custom fallback fields (v2.0).
- ✓ [GraphQL Integration] — End-to-end wiring of the UI with the backend Autopilot mutations (v2.0).
- ✓ [Best Practice Refactoring] — Overhaul all video scripts using stateless Remotion hooks (v3.0).
- ✓ [Autopilot Engine Visualization] — Compositions highlighting nested evaluations, fail-fast chains, and loop blockers (v3.0).
- ✓ [Visual Dashboard Showcase] — Showcase high-fidelity admin dashboard UIs (v3.0).
- ✓ [Feature Showcase Upgrade] — Integrate Autopilot Feature Segment into the hook composition (v4.0).
- ✓ [Legacy Engine Teardown] — Safely removed core logic while preserving UI (v5.0).
- ✓ [Entity-Agnostic Condition Engine] — Implemented modular, hash-deduplicated evaluation logic (v6.0).
- ✓ [Lazy-Context Action Engine] — Implemented sequence processor with async resolvers and dirty tracking (v6.0).
- ✓ [Event-Driven Pipeline Orchestrator] — Implemented resumable sequential engine with bulk-update aggregation (v6.0).
- ✓ [UI-v1 Dynamic Context] — Support dynamic trigger entity selection and lazy-context field lookups (v7.0) — Validated in Phase 27: Builder & Canvas Alignment.
- ✓ [UI-v1 Sequential Pipeline] — Update Pipeline Editor to align with v6.0 sequential payload schema (v7.0) — Validated in Phase 27: Builder & Canvas Alignment.
- ✓ [High-Performance CTE Outbox Writes] — Single-query bulk updates + outbox insertion in SmartAggregator (v8.0).
- ✓ [Asynchronous Depth Guards] — TraceId + depth propagation across async Kafka loops to enforce recursion limits (v8.0).
- ✓ [Auto-Action Condition AST Schema] — Define structural AST types for logical (AND/OR/NOT) and predicate operations under TASK scope (v9.0).
- ✓ [Fresh-Fetch Condition Evaluator] — Implement dynamic, optimistic-safe recursive evaluator using current/previous states (v9.0).
- ✓ [Dynamic Scope & Template Sync] — Integrate condition variables and schemas in registry template and metadata output (v9.0).
- ✓ [Action & Condition Engine Isolation] — Decouple and isolate execution engines independently without tied triggers or tied flows (v10.0).
- ✓ [Context Engine] — Centrally resolve, merge snapshots, and validate type-safe entity contexts via registries and database resolvers (v11.0).
- ✓ [Tied Rule Orchestration] — Tie independent triggers, conditions, actions, and context resolvers together into unified execution rules (v12.0).
- [ ] [Auto Action Re-sectoring] — Restructure the auto-action module to match the established Controller/Service/Queries pattern; route cross-module operations through service interfaces (v13.0).
- [ ] [Multi-domain Triggers] — Evaluate events crossing project boundaries.
- [ ] [Complex Predicates] — Evaluate conditions referencing recursive parent/child states.

### Out of Scope

- [Cron-based Triggers] — Reactive/event-driven architecture remains primary focus.
- [External Service Actions] — Scope confined to internal Taskinator domain mutations.

## Next Milestone Goals (v13.0 — Auto Action Re-sectoring)

**Goal:** Make the `auto-action` module architecturally consistent with every other module. Two concrete changes:
1. **Service layer**: Replace `auto-action-engine/manager.ts` with `AutoActionService` interface + `internal/AutoActionServiceImpl` + `internal/AutoActionQueries` — matching the task/project/team pattern.
2. **Decoupled DB access**: Route all Task interactions in `scopes/task/` through `taskService` (via a new `getTaskContextById` method) instead of calling `db` directly.

## Current State (Post-v12.0)

The Auto Action Engine is fully operational. All three isolated engines (Action, Condition, Context) are tied together into a sequential, suspendable execution pipeline. Persistent `prev_` columns on `project_task` guarantee transition-state accuracy under concurrent execution. The legacy `autopilot` module has been removed. The system is ready for trigger wiring and API exposure.

## Key Decisions

| Key Decisions | Rationale | Outcome |
|----------|-----------|---------|
| Action Chain Model | Ensures predictable execution order and atomicity. | **Complete** |
| Live-Context Evaluation | Prevents logic execution on stale snapshots; ensures data integrity. | **Complete** |
| TraceID + Depth Loop Detection | Simpler and more reliable than mutation hashing for initial release. | **Complete** |
| SSE Streaming | Low-latency progress updates without polling overhead. | **Complete** |
| XYFlow Serialization | Decoupled graph coordinate state from logical execution JSON trees. | **Complete (v2.0)** |
| Optimistic Queries | Instantly toggle Active state via TanStack Query to guarantee premium responsive feel. | **Complete (v2.0)** |
| Stateless Remotion Primitives | Decouple UI updates from implicit browser/CSS runtimes to achieve 100% frame-accurate render stability. | **Complete (v3.0)** |
| Dynamic Timeline Orchestrator | Automate cumulative track summation in React to easily adjust scene durations without manual math. | **Complete (v3.0)** |
| Engine Amputation | Remove broken execution code before rebuilding to stabilize system and provide a clean slate. | **Complete (v5.0)** |
| Recursive Kafka Loop | Enables resumable execution and prevents long-running DB locks by processing one step per event. | **Complete (v6.0)** |
| Smart Aggregation (CASE) | Optimizes high-throughput updates by grouping heterogeneous mutations into single SQL roundtrips. | **Complete (v6.0)** |
| Single-Query CTE Writes | Reduces PostgreSQL round-trips to exactly 1 query for high-throughput outbox event emission. | **Complete (v8.0)** |
| Strict depth hop ceiling | Prevent resource exhaustion by halting recursive events exceeding a depth of 50. | **Complete (v8.0)** |
| Isolated Engines | Introduce completely standalone actionEngine and conditionEngine for high modularity. | **Complete (v10.0)** |
| Context Engine | Centrally resolve, merge snapshots, and validate type-safe entity contexts via registries and database resolvers. | **Complete (v11.0)** |
| Tied Rule Orchestration | Sequential pipeline executor binding context, conditions, and actions; persistent prev_ columns for concurrent-safe transition state; condition splitting for future async chunking. | **Complete (v12.0)** |
| Auto Action Re-sectoring | Service interface + internal Queries/ServiceImpl pattern; task scope goes through taskService not bare db. | **In Progress (v13.0)** |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-05-21 — v13.0 initiated*
