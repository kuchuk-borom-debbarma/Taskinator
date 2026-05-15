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

### Active (V2)

- [ ] [Multi-domain Triggers] — Support for events crossing project/team boundaries.
- [ ] [Visual Definition Builder] — UI for managing autopilots.
- [ ] [Execution Metrics] — Aggregated throughput and failure rate reporting.

### Out of Scope

- [Cron-based Triggers] — V1/V2 focus is purely reactive/event-driven.
- [External Service Actions] — Initial version is scoped to internal Taskinator domain mutations.

## Current State (v1.0)
The core engine is shipped. It supports reactive task automation, complex boolean conditions, sequential action chains, and real-time audit streaming via SSE. All core safety guards (loop detection) are in place.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Action Chain Model | Ensures predictable execution order and atomicity. | **Complete** |
| Live-Context Evaluation | Prevents logic execution on stale snapshots; ensures data integrity. | **Complete** |
| TraceID + Depth Loop Detection | Simpler and more reliable than mutation hashing for initial release. | **Complete** |
| SSE Streaming | Low-latency progress updates without polling overhead. | **Complete** |

---
*Last updated: 2026-05-15 after v1.0 milestone completion*
