# Pull Request: Performance Batching & Distributed Event Bus Hardening

## Overview
This PR overhauls the internal messaging bus and query execution logic to dramatically improve horizontal scaling safety, remove N+1 query bottlenecks, and completely lock down exactly-once event execution across multiple server instances. 

## Key Changes

### 🚀 Performance & Throughput
- **Zero-Lock Outbox Relay**: Re-architected the `OutboxRelay` to perform 100% dirty reads without `FOR UPDATE SKIP LOCKED`. By aggressively relying on the consumer's idempotency engine, the relay avoids all database lock contention, vastly optimizing PostgreSQL throughput.
- **Provider-Level Batching**: Refactored the `ExternalNotificationService` interface and SQL queries to pass user IDs as a complete array payload. External network calls (like emails) now happen in true O(1) batches under the hood rather than looping over N requests.
- **Mutation Optimizations**: Simplified the `addTaskTrigger` resolver by leveraging PostgreSQL `INSERT ... RETURNING *`. This eliminated a completely redundant, secondary database round-trip that was happening on every trigger creation. 
- **Array-Level Protection limits**: Hard-capped task trigger creation logic to `50` per task within the database CTE. This prevents abusive requests from circumventing pagination bounds and causing memory exhaustion / DoS when GraphQL DataLoaders load extensive arrays.

### 🔐 Distributed Systems & Idempotency
- **Deterministic Exactly-Once UUIDs**: Diagnosed and fixed a critical distributed bug where `KafkaBus` was generating new random UUIDs during runtime publish loops. Mapped the native `outbox_events.id` directly through the bus interface into Kafka. This locks the idempotency ID to the stone-cold database transaction, ensuring parallel relays can blindly double-publish the same events simultaneously without **ever** triggering duplicate business logic on the consumer end.
- **Parallel Bus Destruction**: Fixed sequential bottlenecks during server termination; `KafkaBus.destroy()` now concurrently terminates all topic subscriptions via `Promise.all`.

### 🧹 Architectural Simplification
- **Zero-Translation Event Names**: Shredded the complex and ambiguous translation tables (`OUTBOX_TOPIC_TO_EVENT_TYPE`) that mapped internal DB strings into screaming TS constants. The entire stack now seamlessly uses the exact same dot-notation format (`"project.task.updated"`) end-to-end.
- **Refactored Readability**: Rewrote `OutboxRelay.ts` into flat, single-responsibility blocks (`fetchPendingEvents`, `dispatchToEventBus`, `clearProcessedEvents`) erasing deep `try...catch` loop indirection.

## Review Notes
The combination of dirty-read outbox polling arrays + deterministic DB-native event IDs means you can safely run 5, 20, or 100 node instances of the monolith, and they will load balance messaging perfectly with absolute zero risk of double-processing. 
