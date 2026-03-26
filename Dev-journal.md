# Dev Journal — Entry 1 (Base Tech Stack)

## Architecture Decision

**Modular Monolith** over microservices for the initial build.

The core domains — Projects, Teams, Tasks, and the Event Engine — are well-defined enough to enforce clear module boundaries in code. Starting with a modular monolith keeps things operationally simple while preserving the ability to extract services later, when there's real traffic data pointing to where the pressure is. Microservices at this stage would add distributed systems overhead before the domain model is even stable.

---

## Tech Stack

**Kotlin + Spring Boot** — Mature, battle-tested framework with a rich ecosystem. Kotlin removes Java boilerplate while staying fully interoperable with the JVM.

**PostgreSQL** — The data model is relational and structured. Projects, teams, tasks, and their relationships benefit from strict schemas and foreign key constraints.

**JOOQ** — Thin abstraction over SQL, keeps queries close to the metal and predictable under load.

**Spring Security + JWT** — Stateless authentication baked into the Spring ecosystem, plays well with a high-throughput system.

**Redis** — Fast ephemeral storage for caching and rate-limiting.

**Kafka + Spring Kafka** — Durable, ordered event streaming for handling task completion events asynchronously at scale.

---

# Dev Journal — Entry 2 (Kafka Design Pt-1)

## Partition Key

`projectId` is the partition key across all topics. Everything — teams, tasks, members — is scoped under a project, so ordering needs to be consistent within a project.

## Topic Structure

One topic per domain entity keeps consumers decoupled and focused. A single `project` topic would force every consumer to filter out events it doesn't care about.

**`project-events`** — project created, updated, deleted

**`team-events`** — team created, deleted

**`task-events`** — task created, updated, completed, deleted

**`member-events`** — member added, removed

## Cascade Deletes

When a project is deleted and teams, members, and tasks need to be cleaned up, this is handled via the **Saga pattern**. The `project-events` consumer listens for `project.deleted` and publishes downstream events to the relevant topics. Each consumer handles its own cleanup — no single consumer owns the full cascade.

This keeps the dependency chain choreographed through events rather than hardcoded.

---

# Dev Journal — Entry 3 (Database Schema Pt-1)

## Scope

Starting with the Project domain only — `projects` and `project_members`. No premature optimization; just a clean normalized schema to get the foundation right.

## Design Decisions

**No soft deletes for now** — hard deletes keep the schema and queries simple at this stage. Can be revisited if audit trails become a requirement.

**Optimistic locking on `projects`** — projects are read-heavy with infrequent writes, making optimistic locking a natural fit. Avoids the overhead of pessimistic locks while still protecting against concurrent update conflicts.

**No denormalization yet** — keeping the schema normalized at this stage. Denormalization is an optimization decision that should be driven by real query patterns, not assumptions.

## Access Patterns

Both `projects` and `project_members` are read-heavy. Members are added infrequently — reads will vastly outnumber writes, which aligns well with the caching strategy via Redis.