# Transactional Outbox Pattern

To achieve 100% reliability in event delivery, Taskinator implements the **Transactional Outbox Pattern**. This ensures that we never lose an event if the system crashes between a database update and a Kafka publish.

## ❓ The Problem

In a distributed system, you cannot atomically update a database and publish to Kafka in a single transaction. If the database update succeeds but the Kafka publish fails (due to network error or crash), the rest of the system becomes inconsistent.

## ✅ The Solution: The Outbox

Instead of publishing to Kafka directly from the business logic, we follow these steps:

### 1. Atomic Database Write (wCTE)
We use a Data-Modifying Common Table Expression (wCTE) to perform the business update and the event insertion in a single SQL statement.

```sql
WITH inserted_task AS (
    INSERT INTO project_task (id, project_id, title)
    VALUES ($1, $2, $3)
    RETURNING *
)
INSERT INTO outbox_events (stream, stream_key, payload)
SELECT 'task.created', project_id, json_build_object('id', id, 'title', title)
FROM inserted_task;
```

### 2. The Outbox Relay
A lightweight, dedicated background worker (the **Outbox Relay**) continuously polls the `outbox_events` table.
- **Poll**: Selects a batch of pending events.
- **Publish**: Publishes them to Kafka.
- **Cleanup**: Deletes the events from the `outbox_events` table ONLY after Kafka acknowledges the publish.

## 🛡 Fault Tolerance

- **Network Interruption**: If Kafka is down, the events stay safely in the `outbox_events` table. The relay will retry until successful.
- **Relay Crash**: If the relay crashes after publishing but before deleting from the DB, the new relay instance will re-publish the events.
- **Duplicate Handling**: Since we use the event's unique UUID, the consumers will detect the duplicate and discard it using their idempotency engine.

## 📈 Scaling the Relay
The Outbox Relay is designed to be near-zero latency. By deleting events immediately after success, the table remains small, ensuring that polling queries are always fast (O(1) index lookups).
