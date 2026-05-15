# Event-Driven Flows

The backbone of Taskinator's high-throughput performance is its Event-Driven Architecture (EDA). This document explains how events flow through the system and trigger automated workflows.

## 🔄 The Event Lifecycle

1.  **Mutation**: A user performs an action (e.g., updating a task status).
2.  **Atomic Persistence**: The domain service updates the primary table and inserts an event into the `outbox_events` table in a single transaction.
3.  **Relay**: The **Outbox Relay** (background poller) picks up the pending event and publishes it to the appropriate Kafka topic.
4.  **Consumption**: One or more consumers (listeners) receive the event and perform secondary actions.

## 🌊 Cascading Workflows

Taskinator uses events to handle complex, multi-step cascades without blocking the main user request.

### 1. Recursive Deletions (The "Bubbling" Pattern)
When a root task with thousands of sub-tasks is deleted:
- The system marks the root as deleted and fires `task.parent.deleted`.
- A consumer catches this, finds the immediate children, deletes them in a batch, and fires new `task.parent.deleted` events for each child.
- This "bubbles down" the tree level-by-level until the entire hierarchy is purged.

### 2. Trigger Engine (Automations)
The **Task Trigger Engine** reacts to status changes via events:
- **Parent-Guard Trigger**: When a child task is marked "DONE", an event is fired. The trigger listener checks if all other siblings are "DONE". If they are, it automatically advances the parent task status.
- **Safety Net**: Every event carries a `userId`. If the `userId` is `SYSTEM`, listeners typically ignore it to prevent infinite recursive loops.

## 🛠 Reliability Guarantees

- **Exactly-Once Processing**: Every event is published with a unique UUID. Consumers use an idempotency check (via `processed_event` table) to ensure that even if an event is delivered multiple times by Kafka, its logic is only executed once.
- **Project-Level Ordering**: We use `projectId` as the Kafka partition key. This guarantees that all events for a specific project are processed in the exact order they occurred.

## 🔗 Related
- [Kafka Outbox Pattern](./Kafka-Outbox-Pattern.md)
- [Architecture Overview](./Architecture-Overview.md)
