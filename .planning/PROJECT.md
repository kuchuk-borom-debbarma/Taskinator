# Taskinator — Backend Rules Engine

## What This Is

Taskinator is a high-performance orchestration engine. Previously (Milestone v1.0), this project focused on building an Architecture Video using Remotion. Starting from Milestone v1.1, the project has pivoted to building the actual backend implementation in the Spring Boot Workspace service. The current focus is on building an Event-Driven Rules/Trigger Engine and refactoring the Server-Sent Events (SSE) system.

## Core Value

A lightning-fast, highly scalable asynchronous automation engine that allows users to define custom triggers without impacting the core API latency (10k RPS target).

## Current Milestone: v1.1 Event-Driven Rules Engine & SSE Refactor

**Goal:** Build a high-performance asynchronous trigger system for the Taskinator backend and refactor the existing Real-Time SSE architecture for better maintainability and developer experience.

**Target features:**
- Task Domain Bootstrapping
- Core Rules Engine (Triggers on Tasks, Projects, Teams, Members)
- Async Execution & Chaining via Kafka
- SSE System Refactoring

## Requirements

### Validated

*From Milestone v1.0 (Architecture Video in `remotion/src/`):*
- ✓ Feature showcase, Schema design, N+1 query problem, Denormalization solution
- ✓ Closure table solution, Synchronous baseline flows, Thread blocking problem
- ✓ Async intro + flows, Transactional Outbox pattern, Upgraded async flow
- ✓ Concurrency & optimistic locking, Smart event aggregation
- ✓ Chunked background deletion, Real-time SSE composition, Final architecture

### Active

- [ ] Task Domain: Establish foundational Task entity models
- [ ] Triggers API: Endpoints to define Event + Condition + Action triggers
- [ ] Async Executor: Consume Kafka events and execute matching triggers
- [ ] Chaining: Support triggers that produce events which trigger other rules
- [ ] SSE Refactor: Clean up and simplify the Real-Time SSE push mechanism

## Current State

**v1.1 Started**: Pivoting from Remotion video to the Spring Boot `workspace` backend service.

## Context

The backend service `Workspace Service` uses Spring Boot 4.0.2, Kotlin, Exposed ORM, and PostgreSQL. It handles Projects and Teams using a Closure Table for deep hierarchies and Optimistic Locking (version column) for concurrency.
The existing 10k RPS optimizations (e.g. outbox pattern, async execution) must be respected.

## Constraints

- **Tech stack**: Spring Boot, Kotlin, Exposed ORM, PostgreSQL, Kafka.
- **Performance**: Must not impact the synchronous API endpoints. Triggers must execute asynchronously.
- **Scalability**: Must support parallel execution and handle heavy triggers without bottlenecking.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Pivot to Backend | The architecture video is complete; it's time to build the real system. | Active |
| Async Triggers via Kafka | Synchronous triggers would violate the 10k RPS latency target. | Active |
| Real-Time SSE for UI | To ensure the frontend stays updated when background triggers mutate state. | Active |

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
*Last updated: 2026-05-14*
