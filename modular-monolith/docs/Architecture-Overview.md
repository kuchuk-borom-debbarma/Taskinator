# Architecture Overview

Taskinator-v2 is designed from the ground up for high-performance workflow orchestration. Our architecture prioritizes non-blocking execution, targeted data routing, and extreme database efficiency.

## 🏛 Core Philosophy

The system adheres to three main architectural pillars:

1.  **Asynchronous by Default**: Any operation that does not require immediate client feedback is offloaded to background workers via an Event-Driven Architecture (EDA).
2.  **Modular Monolith**: Logic is partitioned into domain-specific modules (Task, Project, Team, etc.) that share a deployment unit but maintain strict internal boundaries.
3.  **Batch-First Processing**: Every layer—from Kafka consumers to Database writes—is optimized for bulk operations to maximize throughput and minimize overhead.

## ⚙️ Technical Stack

- **Runtime**: [Bun](https://bun.sh/) / Node.js
- **Database**: PostgreSQL (with Materialized Paths & Partitioning)
- **Message Broker**: Kafka (for domain events)
- **Caching & Routing**: Redis (for real-time targeted routing & pub/sub)
- **API**: GraphQL (Yoga) with SSE for subscriptions
- **Tracing**: Topo-Tracer explicit node/edge graphs for GraphQL mutation lifecycles

## 🗺 System Blueprint

### 1. High-Performance Writes
We use **Write-Common Table Expressions (wCTEs)** to perform business logic updates and event outbox inserts in a single atomic database roundtrip. This ensures that every state change is guaranteed to be published to Kafka without the overhead of heavy distributed transactions.

### 2. Hierarchical Data (Materialized Paths)
To support infinitely nested tasks, we use **Materialized Paths**. This allows us to fetch entire sub-trees or calculate recursive state (e.g., "are all children done?") in a single index-backed query, avoiding the O(N) write amplification of Closure Tables or the recursive depth issues of Adjacency Lists.

### 3. Targeted Real-time Routing
Instead of broadcasting events to every connected client (naive fan-out), Taskinator uses an "Air Traffic Control" pattern. A dedicated Router consumer checks a Redis-based mapping of `User -> InstanceID` and routes events only to the specific server node where the user is connected.

### 4. Lifecycle Tracing
Taskinator uses Topo-Tracer to model GraphQL mutation lifecycles as explicit node/edge graphs. The tracing contract, coverage rules, importance levels, payload policy, and async `_trace` propagation rules are defined in [Tracing](./Tracing.md).

## 🔗 Further Reading

- [Modular Monolith Design](./Modular-Monolith-Design.md)
- [Event-Driven Flows](./Event-Driven-Flows.md)
- [Kafka Outbox Pattern](./Kafka-Outbox-Pattern.md)
- [Tracing](./Tracing.md)
- [Real-time Routing](./Realtime-Routing.md)
