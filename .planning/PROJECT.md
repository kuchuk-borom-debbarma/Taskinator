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

- [ ] [Multi-domain Triggers] — Evaluate events crossing project boundaries.
- [ ] [Complex Predicates] — Evaluate conditions referencing recursive parent/child states.

### Out of Scope

- [Cron-based Triggers] — Reactive/event-driven architecture remains primary focus.
- [External Service Actions] — Scope confined to internal Taskinator domain mutations.

## Next Milestone Goals (v8.0)

**Goal:** Establish advanced monitoring, cross-project event evaluation, and high-performance throughput optimizations for Autopilot execution.

**Target features:**
- Implement Multi-domain Triggers to evaluate events crossing project boundaries.
- Integrate Complex Predicates to evaluate conditions referencing recursive parent/child states.
- Set up real-time SSE execution tracing dashboards in `ui-v1`.

## Current State (Post-v7.0)
The Autopilot engine has been fully rebuilt (v6.0) and the frontend application `ui-v1` has been completely synchronized (v7.0) to support recursive ast condition evaluation, lazy context resolution, sequential pipelines with drag-and-drop reordering, and frame-accurate visual flows. All components are fully verified with a 100% test passing rate.

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-17 after v7.0 milestone completion*
