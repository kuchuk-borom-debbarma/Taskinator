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

### Active (Future Planning)

- [ ] [Multi-domain Triggers] — Evaluate events crossing project boundaries.
- [ ] [Complex Predicates] — Evaluate conditions referencing recursive parent/child states.

### Out of Scope

- [Cron-based Triggers] — Reactive/event-driven architecture remains primary focus.
- [External Service Actions] — Scope confined to internal Taskinator domain mutations.

## Current State (v2.0)
The v2.0 UI is fully operational. Users can define visually expressive conditional trees using React XYFlow, assemble sequential execution steps via pipelines, toggle automations with zero-latency optimistic updates, and configure custom fallbacks via smart selector overlays. The UI is seamlessly bound to transactional backend resolvers.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Action Chain Model | Ensures predictable execution order and atomicity. | **Complete** |
| Live-Context Evaluation | Prevents logic execution on stale snapshots; ensures data integrity. | **Complete** |
| TraceID + Depth Loop Detection | Simpler and more reliable than mutation hashing for initial release. | **Complete** |
| SSE Streaming | Low-latency progress updates without polling overhead. | **Complete** |
| XYFlow Serialization | Decoupled graph coordinate state from logical execution JSON trees. | **Complete (v2.0)** |
| Optimistic Queries | Instantly toggle Active state via TanStack Query to guarantee premium responsive feel. | **Complete (v2.0)** |

---
*Last updated: 2026-05-15 after v2.0 milestone completion*

