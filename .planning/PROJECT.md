# Taskinator — Project Autopilot System

## What This Is

A high-performance, data-driven automation engine for the Taskinator-v2 workflow platform. It enables projects to self-manage by executing complex, multi-step actions in response to domain events without manual intervention.

## Core Value

Automate the "busy work" of project management through reliable, transparent, and high-speed execution chains.

## Requirements

### Validated

<!-- Inferred from existing brownfield codebase -->
- ✓ [Core Domain Service Pattern] — established in `src/modules`
- ✓ [Transactional Outbox Pattern] — implemented in `src/utils/event-bus`
- ✓ [Materialized Path Hierarchy] — implemented in `src/modules/task`
- ✓ [Kafka Event Bus] — initialized in `src/kafka`

### Active

- [ ] [Autopilot Core Engine] — Generic, data-driven execution framework.
- [ ] [Context-Aware Condition Evaluator] — Live-DB evaluation with Boolean logic (AND/OR/NOT).
- [ ] [Ordered Action Chaining] — Linked-list execution model with "fail-fast" atomicity.
- [ ] [Loop Detection] — TraceID + Mutation-Hash based infinite cycle prevention.
- [ ] [Audit Logging] — Real-time execution logs for UI visibility.

### Out of Scope

- [Cron-based Triggers] — V1 focus is purely reactive/event-driven.
- [Cross-Project Triggers] — Initial version is scoped to events within a single project.
- [Visual Builder] — UI for defining autopilots will be handled in a later milestone; V1 is data-driven (DB configuration).

## Context

Taskinator-v2 is a high-throughput modular monolith (10k RPS target). The Autopilot system must be non-blocking and horizontally scalable. It leverages Kafka for event distribution and PostgreSQL for persistent state and audit logs.

## Constraints

- **Performance**: Autopilot evaluation must not introduce significant lag into the event processing pipeline.
- **Reliability**: Action chains must be atomic at the autopilot level; failure at step N must halt step N+1.
- **Safety**: Infinite loops must be detected and terminated before they impact system stability.
- **Data-Driven**: Autopilot definitions must be stored in the database, allowing for dynamic updates without code deployment.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Action Chain Model | Ensures predictable execution order and atomicity. | — Pending |
| Live-Context Evaluation | Prevents logic execution on stale snapshots; ensures data integrity. | — Pending |
| TraceID + Hash Loop Detection | Allows for complex task evolution while blocking redundant infinite cycles. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-15 after initialization*
