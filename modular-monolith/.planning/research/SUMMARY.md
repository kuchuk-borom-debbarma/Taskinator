# Research Summary: Project-Level Throttling

This document synthesizes research into implementing robust resource isolation and throttling for the Taskinator-v2 modular monolith.

## Executive Summary

Taskinator-v2 requires a multi-layered throttling strategy to ensure that a single "noisy neighbor" project cannot degrade performance for others. Research confirms that effective throttling in a modular monolith must move beyond simple API rate limits to include background task fairness and database-level resource guards. The recommended approach follows a **"Guardrail" pattern**, intercepting requests at the middleware, task queue, and database transaction layers using a consistent **Project Identity Context**.

The strategy prioritizes **Fair-Share scheduling** for the Outbox Relay and Reachability Engine updates, using SQL window functions to ensure no single project can starve others. We will utilize `rate-limiter-flexible` for API-level throttling and `Bottleneck` for managing background concurrency, both backed by a shared Redis cluster to maintain distributed state. The most critical risk identified is **cascading inconsistency**, where an action is allowed but its background side effects are throttled; this will be mitigated by implementing "budget estimation" checks before critical writes.

## Key Findings

### Technology Stack (from STACK.md)
- **Rate Limiting:** `rate-limiter-flexible` for its atomic Redis operations and high performance.
- **Task Throttling:** `Bottleneck` due to its native support for project-based grouping (`.Group()`).
- **Distributed State:** `ioredis` for managing quotas across multiple Node.js instances.
- **DB Guardrails:** Native PostgreSQL `SET LOCAL statement_timeout` within transactions to enforce per-query limits.
- **Observability:** `pg_stat_statements` and `prom-client` to monitor "429" events and query cancellations per project.

### Feature Landscape (from FEATURES.md)
- **Table Stakes:** Per-project request limits, Fair-Share Outbox fetch, and usage metering for visibility.
- **Differentiators:** Cost-based quotas (charging more for complex graph updates) and "Burst Capacity" to allow temporary spikes.
- **Anti-Features:** Global per-user throttling should be avoided; throttling must be scoped to the **Project** level to prevent cross-project work disruption.

### Architecture Patterns (from ARCHITECTURE.md)
- **Pattern: Fair-Share Fetching:** Use SQL window functions (e.g., `ROW_NUMBER() OVER (PARTITION BY project_id ...)`) to ensure every batch of events fetched from the Outbox contains a representative mix of projects.
- **Pattern: Transactional Guardrails:** Wrap DB executions in a utility that injects project-specific timeouts, ensuring rogue queries are killed before they impact the connection pool.
- **Pattern: Context Propagation:** Use `AsyncLocalStorage` to carry the `project_id` from the API request down to the DB and event layers.

### Critical Pitfalls (from PITFALLS.md)
- **Cascade Corruption:** Throttling background graph updates after the initial write has succeeded can leave the system in an inconsistent state.
- **Redis Latency:** Adding synchronous Redis checks to every request can increase P99 latency. Mitigation involves using Lua scripts or pipelining for "check-and-consume" operations.
- **Relay Starvation:** A "spammer" project with millions of events can block others if simple batching is used; the Fair-Share SQL pattern is mandatory.

## Roadmap Implications

### Suggested Phase Structure

1.  **Phase 1: Database Evolution & Identity**
    - **Rationale:** Foundation for all subsequent enforcement. We cannot throttle what we cannot identify.
    - **Deliverables:** `project_id` on Outbox table, indices for fair-share querying, Redis infrastructure setup.
    - **Pitfalls to Avoid:** Missing project IDs on "system-wide" events (e.g., user deletion).

2.  **Phase 2: Fair-Share Relay & Metering**
    - **Rationale:** Addresses the most immediate performance bottleneck (Outbox starvation) and starts gathering baseline data.
    - **Deliverables:** SQL Window Function relay logic, usage recording in Redis.
    - **Pitfalls to Avoid:** "Spammer" projects starving the relay.

3.  **Phase 3: API & Task Throttling**
    - **Rationale:** Stabilizes external load and internal task execution.
    - **Deliverables:** `rate-limiter-flexible` middleware, `Bottleneck` groups for Reachability updates.
    - **Pitfalls to Avoid:** Redis latency impact on request handling.

4.  **Phase 4: Database Guardrails**
    - **Rationale:** Final layer of defense against rogue SQL or expensive graph traversals.
    - **Deliverables:** `ThrottledTransaction` wrapper with `SET LOCAL statement_timeout`.
    - **Pitfalls to Avoid:** Resource leakage (timeouts persisting across pooled connections).

5.  **Phase 5: Verification & Hardening**
    - **Rationale:** Ensuring consistency and adding advanced UX features.
    - **Deliverables:** Budget estimation for cascades, soft limit notifications.

### Research Flags
- **Needs Research:** Phase 5 (Budget estimation logic for complex graph updates).
- **Standard Patterns:** Phase 1-4 follow well-documented industry patterns for SaaS isolation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Industry-standard libraries (`rate-limiter-flexible`, `Bottleneck`) with proven Redis integration. |
| Features | HIGH | Clear separation between MVP requirements and advanced differentiators. |
| Architecture | HIGH | Patterns like Fair-Share SQL and `SET LOCAL` are standard Postgres best practices. |
| Pitfalls | MEDIUM | Cascading inconsistency is a difficult problem that will require careful "pre-flight" estimation. |

## Sources
- *rate-limiter-flexible* & *Bottleneck* documentation.
- Stripe Guide to Rate Limiting.
- Shopify Engineering: Throttling Distributed Systems.
- PostgreSQL Documentation: Window Functions and Runtime Config.
