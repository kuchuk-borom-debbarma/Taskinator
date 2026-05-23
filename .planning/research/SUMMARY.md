# Project Research Summary

**Project:** Taskinator-v2
**Domain:** Event-Driven Task Automation
**Researched:** 2025-02
**Confidence:** HIGH

## Executive Summary

Taskinator-v2 is an Event-Driven Task Automation platform that allows users to create triggers, evaluate rules, and execute actions when task states change. Expert systems in this domain are built on an Event-Condition-Action (ECA) pattern decoupled by a Message Broker/Event Bus. This ensures that automated actions are treated indistinguishably from human actions and prevents blocking operations on the primary API.

The recommended approach leverages `@temporalio/client` & `@temporalio/worker` as the durable execution engine and `kafkajs` as the event broker to achieve a resilient, push-based model. `jsonlogic-js` is recommended for safe evaluation of user-defined conditions. The system should avoid the "polling state machine" anti-pattern and directly synchronous execution, opting instead for a Transactional Outbox Pattern to guarantee event emission consistency without locking the primary database.

The key risks include infinite automation loops and dual-write state inconsistencies. Mitigations involve standardizing a robust event payload that includes actor provenance and before/after states, along with queue depth monitoring and explicitly ignoring system-triggered events by default.

## Key Findings

### Recommended Stack

Core technologies for the automation engine and supporting infrastructure:

- **Temporal (`@temporalio/client` & `worker`)**: Durable Execution Engine — The industry standard for complex, multi-step automated actions with guaranteed execution, replacing custom state machines.
- **`kafkajs`**: Event Broker (Pub/Sub) — Decouples core task management from the automation engine, enabling the event-driven requirement.
- **`zod`**: Event Payload & Config Validation — Strict runtime type-safety for incoming events and user-defined automation configurations.
- **`bullmq`**: Lightweight Background Jobs — For high-throughput, atomic tasks where Temporal's overhead isn't needed.
- **`jsonlogic-js`**: User-defined Rule Evaluation — For safely persisting and evaluating user-defined "If X, then Y" rules without arbitrary code execution.

### Expected Features

**Must have (table stakes):**
- **Task Mutation Triggers (Event Emission)** — users expect changes to trigger events.
- **Basic Conditions (Rule Evaluation)** — essential for filtering events based on state.
- **Core Actions (Worker Execution)** — reusing internal APIs for updating status, creating subtasks, etc.
- **Audit Logging** — transparency on why a task changed via automation.

**Should have (competitive):**
- **State-Comparison Conditions** — evaluating "changed FROM X TO Y".
- **Infinite Loop Detection** — automatically pausing cyclic rules to protect system stability.

**Defer (v2+):**
- **Full Infinite Loop Detection** — start with simple `source != system` flags for MVP before building comprehensive cycle detection.

### Architecture Approach

The system uses an Event-Condition-Action (ECA) pattern built over a Message Broker/Event Bus, decoupling triggers from actions.

**Major components:**
1. **Task Engine (Producer)** — Handles CRUD operations and emits standardized domain events (via Transactional Outbox).
2. **Event Bus (Broker)** — Routes events from producers to interested consumers.
3. **Automation Engine (Condition)** — Subscribes to events, fetches workspace rules, and evaluates conditions.
4. **Action Dispatcher / Action Workers (Consumer)** — Buffers validated actions and executes the actual tasks (often by calling Task Engine APIs).

### Critical Pitfalls

1. **Infinite Automation Loops** — Avoid by including an `actor` field in every event and preventing system events from triggering certain rules; monitor queue depth.
2. **Dual Write Problem** — Avoid by implementing the Transactional Outbox Pattern to write events in the same DB transaction as the task mutation.
3. **Event Schema Evolution Crashes** — Avoid by strictly versioning event schemas (e.g., `task.updated.v1`) and never removing fields.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Event Sourcing & Outbox Pattern)
**Rationale:** The system requires a solid mechanism to emit reliable events before any automation can be evaluated.
**Delivers:** Standardized event payloads, database outbox table, basic Event Bus/Broker implementation.
**Addresses:** Task Mutation Triggers (Event Emission).
**Avoids:** Dual Write Problem.

### Phase 2: The ECA Engine (Rule Evaluation)
**Rationale:** With events flowing, the system needs to consume them and evaluate conditions without executing actions yet.
**Delivers:** Automation Engine, rule evaluation integration, and evaluation of hardcoded/mocked rules.
**Uses:** `kafkajs`, `zod`, `jsonlogic-js`.
**Implements:** Automation Engine (Condition) component.

### Phase 3: Action Execution (Workers)
**Rationale:** Now that rules can be evaluated safely, the system needs to execute the resulting actions asynchronously.
**Delivers:** Action Queue, Idempotent Workers, and basic task automation execution.
**Addresses:** Core Actions, Audit Logging.
**Avoids:** Synchronous Webhook/Action Execution latency.

### Phase 4: Configurable Workspaces (User UI & Persistence)
**Rationale:** The underlying engine is proven; it's now safe to expose rule creation to end-users.
**Delivers:** UI and API for dynamic rule creation, management, and persistence.
**Addresses:** Basic Conditions, State-Comparison Conditions.
**Avoids:** Infinite Automation Loops (by implementing simple source-checking flags before exposing rules to users).

### Phase Ordering Rationale

- **Dependencies:** This order ensures the foundational event pipeline is rock solid before building complex rule evaluation. Actions are added once rules can be safely validated, and finally, user-configurable rules are layered on top of a proven backend.
- **Architecture Grouping:** Groups backend messaging separately from frontend configuration.
- **Risk Mitigation:** Solves the dual write problem early so no data is corrupted during development of later phases.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Needs deeper planning on the exact boundary between Temporal and BullMQ depending on action complexity.
- **Phase 4:** Needs research on the precise JSON schema structures for storing user configurations that `jsonlogic-js` will process.

Phases with standard patterns (skip research-phase):
- **Phase 1 & 2:** Standard Transactional Outbox and Event-Condition-Action patterns are well-documented and established.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on industry-standard tools like Temporal, Kafka, and Zod which are heavily documented. |
| Features | HIGH | Clear boundaries identified between MVP features and differentiators. |
| Architecture | HIGH | Established ECA and Outbox patterns resolve structural challenges effectively. |
| Pitfalls | HIGH | Common distributed system pitfalls (loops, dual writes) are well understood with explicit mitigations. |

**Overall confidence:** HIGH

### Gaps to Address

- Complex rule definition schemas: Exactly how to handle complex rule definitions for `jsonlogic-js` from the UI requires UX validation.
- Tool selection threshold: Defining the precise workflow threshold for choosing long-running Temporal execution versus fast BullMQ processing.

## Sources

### Primary (HIGH confidence)
- Temporal.io Documentation — Durable Execution Engine standards
- BullMQ Documentation — Background job best practices

### Secondary (MEDIUM confidence)
- Inngest & Trigger.dev 2024/2025 feature comparisons — Evaluating alternatives for durable execution

---
*Research completed: 2025-02*
*Ready for roadmap: yes*
