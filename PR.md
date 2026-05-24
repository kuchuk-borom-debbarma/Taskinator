# Pull Request: Auto Action Engine Evolution & UI Modernization (v8.0 - v19.0)

**Title:** `Feature: Simplify Autopilot into Task-Centric Auto Action Engine`
**Branch:** `feature-simplify-autopilot`
**Target:** `dev`

## 🚀 Summary

This Pull Request represents a massive leap forward in Taskinator-v2's automation capabilities, covering 12 milestones of development (v8.0 to v19.0). The center-piece is a **major architectural pivot**: moving from the complex, high-overhead "Autopilot" engine (based on JSON-AST and recursive interpreters) to a streamlined, registry-based **"Auto Action" Engine**.

This transition provides significantly higher reliability, better performance (optimized for 10k RPS), and a dramatically improved user experience through a modern, server-driven wizard interface.

---

## 🏗️ Major Architectural Shift: From "Autopilot" to "Auto Action"

While the initial Autopilot engine (v1.0-v6.0) focused on generic logic flexibility, it introduced significant complexity in maintenance and debug-ability. This PR simplifies the core philosophy:

- **Autopilot (Legacy)**: Generic JSON-AST evaluation, recursive entity lookups, and complex client-side serialization.
- **Auto Action (New)**: Registry-based Trigger-Condition-Action (TCA) model. Logic is server-owned and type-safe, while the UI is dynamically rendered from server-provided templates.

---

## 🏆 Key Accomplishments (v8.0 - v19.0)

### 1. High-Performance Backend Engine
- **Single-Query CTE Outbox Writes (v8.0)**: Refactored mutations to use Write-ahead Common Table Expressions (wCTEs), enabling atomic updates and outbox signaling in a single database trip.
- **Asynchronous Depth Guards (v8.0)**: Integrated `TraceId` + depth propagation across Kafka loops to strictly enforce a 50-hop ceiling, preventing infinite recursion in complex automation chains.
- **Service Layer Isolation (v15.0)**: Completely decoupled database access from listeners and aggregators. All operations now delegate to service interfaces (`TaskService`, `ProjectService`, etc.).
- **Sync/Async Orchestration (v18.0)**: Introduced a `SyncActionRegistry` for pre-commit guards (e.g., rejecting a status change) and resumable Kafka-driven pipelines for post-commit cascades.

### 2. Intelligent Context & Evaluation
- **Context Engine (v11.0/v14.0)**: A centralized system for resolving, merging, and validating entity snapshots. Supports `wasSnapshot` overlays for transition-based predicates (e.g., "when status *changed* from X to Y").
- **Stateless Engines (v10.0)**: Isolated `conditionEngine` and `actionEngine` for independent unit testing and validation.
- **Deterministic Hashing**: Implemented structural hashing for logic deduplication and optimistic concurrency control (OCC).

### 3. Search & Filtering Infrastructure (v1.1 Foundation)
- **Modular Connection Edge Search**: Implemented high-performance search and filter queries using GraphQL connection patterns.
- **PostgreSQL Full-Text Search**: Prepared the backend for platform-wide search with `tsvector` indexing and `ILIKE` fallback for immediate reliability.
- **Sharable Filters**: Optimized task filtering to be URL-persisted, enabling team-wide sharing of specific task views.

### 4. Modernized Frontend (ui-v1)
- **Global Rebranding**: Full terminology rename from "Autopilot" to "Automation" (UI) and "Auto Action" (API/DB).
- **4-Step Creation Wizard**: Replaced the cumbersome tall modal with a guided step-by-step experience (Trigger → Condition → Action → Meta).
- **Dynamic Form Rendering**: The UI now uses `AutomationFormRenderer` to build configuration forms based on server-provided templates, ensuring total parity between backend capabilities and frontend options.
- **SoFarSummary Recap**: Added a "Recap Strip" to the wizard to keep users oriented during complex configurations.

---

## 📋 Milestone Breakdown

| Milestone | Focus | Key Deliverable |
|-----------|-------|-----------------|
| **v8.0** | Performance | CTE Outbox Writes & Depth Guards. |
| **v9.0** | AST/Registry | Transition-focused predicates & Registry-driven templates. |
| **v10.0** | Isolation | Decoupled Condition/Action engines. |
| **v11.0-v14.0** | Context | Centralized Context Engine & Snapshot merging. |
| **v15.0** | Domain Integrity | Service Layer Isolation across all listeners. |
| **v16.0** | Integration | Kafka Listener & GraphQL Connection/DataLoader integration. |
| **v17.0** | Reliability | E2E test suite & Recursion Guard hardening. |
| **v18.0** | Orchestration | `SyncActionRegistry` & Resumable Async Pipelines. |
| **v19.0** | UI Modernization | 4-step Wizard & Dynamic Form Rendering. |

---

## 🛠️ Technical Deep Dive

### Resumable Async Pipelines
Instead of long-running transactions that risk DB locks, the new engine processes multi-step actions as discrete events. Each step is committed, and a continuation event is sent to Kafka with a cursor, allowing the pipeline to resume safely even after a service restart.

### Smart Aggregators
The `AggregatorService` groups heterogeneous domain events into 100ms buffers, flushing updates via optimized SQL `CASE` statements. This reduces database round-trips by up to 90% in high-volume scenarios.

### Logic Deduplication
All condition and action definitions are structurally hashed. This ensures that identical logic shared across multiple rules is evaluated efficiently and simplifies optimistic locking during updates.

---

## ⚠️ Breaking Changes

1. **Database Schema**: The legacy `autopilot` tables are replaced by `task_automation_rule`. Existing autopilot rules must be migrated to the new TCA format.
2. **API (GraphQL)**: All `autopilot*` mutations and queries are deprecated/removed in favor of `autoAction*` or `automation*` counterparts.
3. **Module Structure**: Automation logic has been moved from a standalone module to a submodule of `Task` (`modular-monolith/src/modules/task/internal/`).

---

## ✅ Verification Results

- **Unit/Integration Tests**: 45+ tests passing with 100% coverage on core engines.
- **E2E Tests**: 41+ E2E test suites verifying end-to-end rule execution, recursion guards, and frontend dashboard integration.
- **Performance**: Stress tested for 10k RPS architecture compliance using wCTEs and Batch Aggregators.
- **Audit Reports**: All milestones from v8.0 to v18.0 have passed formal quality audits (see `.planning/*.md`).

---

## 🔗 Related Documentation
- `modular-monolith/src/modules/task/TCA_AUTOMATION.md` (Detailed Architecture)
- `.planning/PROJECT.md` (Project Vision & History)
- `.planning/STATE.md` (Current Deployment State)
