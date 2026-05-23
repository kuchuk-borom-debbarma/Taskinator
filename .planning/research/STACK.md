# Technology Stack

**Project:** Taskinator-v2
**Researched:** 2025-02
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework (Automation Engine)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@temporalio/client` & `@temporalio/worker` | `^1.16.2` | Durable Execution Engine | The 2025 industry standard for workflow automation. It replaces custom state machines and manual retry logic by treating TypeScript code as a durable workflow. Ideal for complex, multi-step automated actions that might require sleeping, waiting for external signals, or guaranteed execution despite server crashes. |
| `kafkajs` | `^2.2.4` | Event Broker (Pub/Sub) | Decouples the core task management mutations from the automation engine. The core app emits domain events (e.g., `Task.Status.Changed`) to Kafka, and a Kafka consumer triggers the Temporal workflow, satisfying the "event-driven" requirement. |
| `zod` | `^3.23.8` | Event Payload & Config Validation | Strict runtime type-safety for incoming events from Kafka and user-defined automation configurations. Prevents poison-pill messages from crashing workflows. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bullmq` | `^5.77.1` | Lightweight Background Jobs | Use for high-throughput, atomic, short-lived tasks (like sending a single webhook or email) where the massive orchestration overhead of Temporal isn't needed. Since Redis (`ioredis`) is already in the stack, this is a zero-infra addition for simple background tasks. |
| `jsonlogic-js` | `^2.0.3` | User-defined Rule Evaluation | When users configure "If X happens, do Y", you need a safe way to evaluate those rules against the emitted event payload without executing arbitrary code. JSONLogic is the standard for safely persisting and evaluating rules. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Workflow Engine | **Temporal** | **Inngest** | Inngest provides excellent developer experience and is serverless-native, but it heavily pushes towards their SaaS offering. Temporal is the battle-tested, standard open-source durable execution engine for mission-critical backend monoliths. |
| Workflow Engine | **Temporal** | **Trigger.dev** | Trigger.dev v3 is great for long-running Next.js jobs, but Temporal is vastly superior for complex, stateful orchestration (e.g., waiting for multiple external events) in a Node/Postgres/Kafka backend. |
| Rule Engine | **JSONLogic** | **Custom AST / Eval** | Never use `eval()` or write a custom AST parser for user-defined automation conditions. It introduces massive security risks and maintainability nightmares. |

## What NOT to use and why

1. **Custom Database-backed State Machines:**
   * **Why avoid:** Do not add a `status` column to an `Automations` table and use cron jobs to poll for the next step. This "polling state machine" anti-pattern leads to database contention, hard-to-debug stuck workflows, and immense technical debt when adding new automation steps. Use Temporal to handle state natively.
2. **Direct Synchronous Execution:**
   * **Why avoid:** Do not execute automation logic directly in the same HTTP request as the task mutation. This violates the event-driven requirement, dramatically increases API latency, and means a failed automation (e.g., a failing 3rd party webhook) fails the user's core task update. Always emit to Kafka first.

## Sources

- Temporal.io Documentation (HIGH confidence)
- BullMQ Documentation (HIGH confidence)
- Inngest & Trigger.dev 2024/2025 feature comparisons (MEDIUM confidence)