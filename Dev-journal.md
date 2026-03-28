Here's the complete journal:

---

# Entry 1: Base Tech Stack

## Architecture: Modular Monolith

The initial build uses a **modular monolith** rather than microservices.

The core domains — Projects, Teams, Tasks, and the Event Engine — are well-defined enough to enforce clear module boundaries in code. Starting here keeps operations simple while preserving the option to extract services later, when real traffic data reveals where the pressure actually is. Adopting microservices now would introduce distributed systems overhead before the domain model has even stabilized.

## Tech Stack

**Bun** — Chosen for high performance and its built-in tooling (testing, bundling, runtime).

**PostgreSQL** — The data model is relational and structured. Projects, teams, tasks, and their relationships benefit from strict schemas and foreign key constraints.

**Kysely (with raw SQL for complex validation)** — Used as a query builder for type safety, but complex authorization and validation rules (e.g., checking project membership before task creation) are enforced via **raw SQL with `WHERE EXISTS` clauses**. This ensures atomicity and keeps domain rules close to the data.

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

**`project-member-events`** — member added, removed

**`project-team-events`** — team created, deleted

**`project-team-member-events`** — team member added, removed

**`project-task-events`** — task created, updated, deleted

Events carry an idempotent `eventId` which consumers verify before processing, guarding against duplicate delivery.

## Batching

Events are published to Kafka in batches rather than one at a time. This reduces producer overhead and improves throughput, particularly under write-heavy bursts like bulk task creation or cascade deletes.

## Implementation Details

Kafka producers are integrated directly into the `ServiceImpl` classes. Messages are emitted immediately after successful database operations, ensuring the system broadcasts domain state changes efficiently.

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

Tasks are hierarchical. The system uses a **Materialized Path (`materialized_path`)** approach for high-performance subtree queries. 

### Implementation Details:
- **Insertions**: The path is automatically constructed during insertion by fetching the parent's path and appending the parent's ID.
- **Updates**: When a task's parent is changed, the system uses a recursive-like atomic update (via SQL `WITH` and `LIKE` clauses) to recalculate the path for the task itself and all its descendants. This ensures that the entire subtree is moved correctly without breaking the path structure.
- **Tradeoffs**: While updates (moving subtrees) are more complex, the read efficiency for fetching entire task trees or breadcrumbs is significantly improved, which aligns with the expected query patterns for task management.

---

# Entry 5: Modular Monolith Service Pattern

To enforce strict domain boundaries, each module follows a structured **Service -> Query** pattern:

1. **Service Interface (`*Service.ts`)**: Defines the public API for the domain.
2. **Service Implementation (`*ServiceImpl.ts`)**: Orchestrates business logic, calls query objects, and handles Kafka event emission.
3. **Query Objects (`*Queries.ts`)**: Encapsulates all database interactions. Complex authorization and validation rules are implemented directly in SQL to ensure performance and atomicity.
4. **Internal Testing**: Jest with ESM mocking is used to verify both service and query logic in isolation, ensuring each module's behavior is consistent before it's integrated.