# Dev Journal — Entry 1

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