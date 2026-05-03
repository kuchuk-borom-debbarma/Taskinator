# Architecture Video Script Flow

## Objective
This document outlines the philosophical design and script flow for the Taskinator architecture video. The video takes an evolutionary approach, guiding the viewer from core features down to the low-level engine mechanics, scaling from a simple synchronous flow to a high-performance event-driven architecture.

## 1. The Product Context (What are we building?)
**Goal:** Establish the core features of the orchestration engine before diving into the tech.
*   **Visuals:** UI mockups or abstract representations of the core entities.
*   **Key Talking Points:**
    *   Creating Projects and Teams.
    *   Member management (adding to Projects vs. Teams).
    *   The core engine: Creating tasks and defining complex links/dependencies between them.

## 2. The Data Foundation (How do we store it?)
**Goal:** Translate the features into a database schema, highlighting specific design choices for performance.
*   **Visuals:** ER diagrams and table structures building on screen.
*   **Key Talking Points:**
    *   **Denormalization:** Highlighting where we intentionally break normal forms for read performance.
    *   **Hierarchy Storage & Task Links:** Deep-diving into the **Closure Table** pattern for Teams and Task Links. Explaining why standard parent/child relationships fail at scale and how this design choice supports 50-level deep hierarchies efficiently.

## 3. Architectural Evolution
**Goal:** Show how the backend evolved from a simple synchronous request/response flow to the final high-performance engine. We will discuss each stage in great detail, identifying the problems and the solutions that drove the next evolution.

### The Baseline: Simple Synchronous Flow
*   **Visuals:** A standard Client -> API -> Database request flow.
*   **Talking Points:** How it works for MVP, where it begins to fail under load, and the latency costs of tight coupling.

### The Path to the Final Flow
*   **Evolution 1: Decoupling Identity to the Edge** (Solving Authentication overhead).
*   **Evolution 2: Scaling Throughput & Concurrency** (Solving DB bottlenecks and race conditions).
*   **Evolution 3: Moving to Async Events via Outbox Pattern** (Solving the Dual-Write Problem).
*   **Evolution 4: Implementing the Reachability Engine** (Solving complex Task Graph orchestration).
*   **Evolution 5: Introducing Real-time SSE** (Solving the polling problem).
*   **Evolution 6: Chunked Background Deletion** (Solving the garbage collection lockup).

### The Ultimate Final Flow
*   **Visuals:** The complete, unified architecture diagram in action.
*   **Talking Points:** Reaching 10k RPS with absolute consistency and real-time responsiveness.
