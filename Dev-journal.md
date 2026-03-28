Here's the complete journal:

---

# Entry 1: Base Tech Stack

## Architecture: Modular Monolith

The initial build uses a **modular monolith** rather than microservices.

The core domains — Projects, Teams, Tasks, and the Event Engine — are well-defined enough to enforce clear module boundaries in code. Starting here keeps operations simple while preserving the option to extract services later, when real traffic data reveals where the pressure actually is. Adopting microservices now would introduce distributed systems overhead before the domain model has even stabilized.

## Tech Stack

**Express.js + Node.js** — Lightweight and unopinionated. Gives full control over middleware and routing without framework magic getting in the way.

**PostgreSQL** — The data model is relational and structured. Projects, teams, tasks, and their relationships benefit from strict schemas and foreign key constraints.

**Kysely (mostly raw queries)** — Used primarily as a query builder for type safety and composability, but raw SQL is preferred where clarity or performance demands it. Keeps queries close to the metal.

**JWT** — Stateless authentication; straightforward to implement and well-suited for high-throughput workloads.

**Redis** — Fast ephemeral storage for caching and rate-limiting.

**Kafka** — Durable, ordered event streaming for processing task completion events asynchronously at scale.

---

# Entry 2: Kafka Design (Part 1)

## Partition Key

`projectId` is the partition key across all topics. Since teams, tasks, and members are all scoped under a project, ordering guarantees need to be consistent within a project boundary.

## Topic Structure

One topic per domain entity keeps consumers decoupled and narrowly focused. A single catch-all `project` topic would force every consumer to filter out events it doesn't care about.

**`project-events`** — project created, updated, deleted

**`team-events`** — team created, deleted

**`task-events`** — task created, updated, completed, deleted

Events carry an idempotent `eventId` which consumers verify before processing, guarding against duplicate delivery.

## Batching

Events are published to Kafka in batches rather than one at a time. This reduces producer overhead and improves throughput, particularly under write-heavy bursts like bulk task creation or cascade deletes. Consumers are also batch-aware, processing records in bulk rather than handling each message individually.

## Cascade Deletes

When a project is deleted, downstream cleanup of teams, members, and tasks is handled via the **Saga pattern**. The `project-events` consumer listens for `project.deleted` and publishes downstream events to the relevant topics. Each consumer is responsible for its own cleanup — no single consumer owns the full cascade.

This keeps the dependency chain choreographed through events rather than hardcoded into a single handler.

---

# Entry 3: Database Schema (Part 1)

## Scope

Starting with the Project domain only — `projects` and `project_members`. No premature optimization; just a clean normalized schema to get the foundation right.

## Design Decisions

**Hard deletes** — soft deletes add query complexity without clear value at this stage. Can be revisited if audit trails become a requirement.

**Optimistic locking on `projects`** — projects are read-heavy with infrequent writes, making optimistic locking a natural fit. Avoids the overhead of pessimistic locks while still protecting against concurrent update conflicts.

**No denormalization yet** — keeping the schema normalized. Denormalization is an optimization decision that should be driven by real query patterns, not assumptions.

## Access Patterns

Both `projects` and `project_members` are read-heavy. Members are added infrequently — reads will vastly outnumber writes, which aligns well with the Redis caching strategy.

---

# Entry 4: Database Schema (Part 2 — Task Table)

Tasks are hierarchical, so the schema needs to represent parent-child relationships efficiently. Two main options were considered: **closure table** and **materialized path**.

**Closure table** was ruled out — with a high volume of tasks, the number of rows it generates becomes excessive and wastes storage.

**Materialized path** is the better fit. It's space-efficient and fast to read. The known tradeoff is that updating paths — when a subtree is moved — is slower, but writes are infrequent enough that this is acceptable.