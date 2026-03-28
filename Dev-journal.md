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
---

# Entry 6: Kafka Consumer Design (Cleanup Pattern)

## Decoupled Cleanup via Independent Consumer Groups

To handle the side effects of a `PROJECT_DELETED` event (deleting members, teams, and tasks), the system uses three **independent Kafka Consumer Groups**. 

### Implementation Details:
- **Isolation**: Each cleanup task (Members, Teams, Tasks) runs in its own consumer group (`member-cleanup-group`, `team-cleanup-group`, `task-cleanup-group`). 
- **Resilience**: If the Task database is temporarily unavailable, the Member and Team cleanups will still succeed. The Task consumer will retry independently once the database is back online without blocking other services.
- **Domain Ownership**: Each consumer is located within its respective service (`src/services/<domain>/internal/listeners/`). This ensures that the domain logic for "how to delete a task" remains encapsulated within the Task service.
- **Registry Pattern**: A central `src/kafka/registry.ts` bootstraps all consumers at application startup (`src/index.ts`), providing a single point of visibility for all active background listeners.

### Benefits:
This approach follows the **Choreography Pattern**. The Project service simply broadcasts that a project was deleted; it doesn't need to know who is listening or what they need to do. This makes the system highly extensible—if a new "Notification" service needs to send emails when a project is deleted, we just add a new consumer group without touching existing code.

---

# Entry 7: Project Member Cleanup Strategy

## Automated Cascading Cleanups for Member Removal

When a member is removed from a project (`PROJECT_MEMBER_DELETED`), the system must ensure data consistency across multiple domains. We implemented two new specialized listeners to handle this asynchronously.

### Domain-Specific Actions:
1. **Team Service**: A new listener in the Team domain (`team-member-cleanup-group`) automatically removes the user from all teams they belonged to within that specific project. This prevents ghost members in teams.
2. **Task Service**: A listener in the Task domain (`task-member-cleanup-group`) unassigns the user from any tasks they were responsible for in that project by setting `fk_member_id` to `null`. This preserves the task data but clears the responsibility.

### Technical Refinement:
- **Kysely Integration**: Updated the central `Database` interface to include the `projectTeamMember` table definition and standardized on camelCase table naming conventions (`projectMember`, `projectTask`, `projectTeam`) to align with Kysely's type-safety requirements.
- **Registry Expansion**: These listeners were added to the central Kafka registry, ensuring they start/stop with the main application lifecycle.

---

# Entry 8: Integration Testing Decoupled Systems

## The "Spy & Poll" Strategy

Testing decoupled systems requires moving beyond unit tests. Since Producers and Consumers operate asynchronously, we implemented an **Integration Test Pattern** (`src/services/project/internal/__tests__/ProjectCleanup.test.ts`) that verifies the entire cycle from event emission to database cleanup.

### Key Principles:
- **Real Components**: The test uses the actual `ProjectService` (Producer) and the `ProjectDeletedListener` (Consumer) connected to a real Kafka broker.
- **The "waitFor" Helper**: Since Kafka delivery is eventual, the test uses a polling mechanism with a timeout. It repeatedly asserts against the database for up to 5 seconds to allow time for message processing.
- **Targeted Bootstrapping**: By exporting individual listener instances in `src/kafka/registry.ts`, we can initialize only the specific consumer under test. This keeps tests fast and isolated from unrelated domain logic.
- **Seed, Trigger, Assert**: 
  1. **Seed**: Create a project and a dependent task.
  2. **Trigger**: Call the public service method (`deleteProjects`).
  3. **Assert**: Poll the database until the task is successfully removed by the background consumer.

This pattern provides high confidence that our domain boundaries are respected while ensuring the choreography between services works as intended in a production-like environment.

---

# Entry 10: Polymorphic Event Bus for Infrastructure-Free Testing

## Decoupling from Kafka Infrastructure

To allow for rapid development and testing without requiring a local Kafka broker, we introduced a polymorphic **EventBus Abstraction** (`src/utils/EventBus.ts`). 

### Architectural Components:
- **Bus Interface**: A unified API for `publish`, `subscribe`, `init`, and `destroy`.
- **MemoryBus (Test Mode)**: Activated when `process.env.NODE_ENV === 'test'`. It uses a native Node.js `EventEmitter` to handle message passing in-memory. This allows integration tests to verify decoupled service choreography in milliseconds with zero setup.
- **KafkaBus (Production Mode)**: The default implementation that wraps `kafkajs`. It handles real network connections, topic subscriptions, and consumer groups.

### Benefits:
1. **Speed**: Tests no longer wait for network handshakes or broker rebalances.
2. **Reliability**: We can now verify that `ProjectService` emits the correct event and that `TaskListener` reacts by cleaning up the database, all within a standard Jest environment.
3. **Flexibility**: The system can easily swap message brokers (e.g., to RabbitMQ or AWS SNS) by simply implementing a new `Bus` class, without touching any business logic in the services or listeners.

---

# Entry 11: Cascading Cleanup for Teams and Team Members

## Refined Event-Driven Consistency

To maintain strict data integrity as users move in and out of teams, we expanded the **Choreography Pattern** to handle team-level deletions and membership changes.

### Architectural Improvements:
- **Team Deletion Cleanup**: When a team is deleted (`PROJECT_TEAM_DELETED`), two independent listeners now trigger:
  1. **Task Service**: Unassigns both the `teamId` and `memberId` (sets them to `null`) for all tasks previously assigned to that team.
  2. **Team Service**: Deletes all member associations for that team from the `project_team_member` table.
- **Team Member Removal Cleanup**: When a specific user is removed from a team (`PROJECT_TEAM_MEMBER_DELETED`), a new listener in the **Task Service** unassigns only that user from tasks within that specific team.

### Systemic Bug Fixes & Refinement:
- **EventBus Flattening**: Refactored the `EventBus` (both `KafkaBus` and `MemoryBus`) to automatically unwrap and flatten the `value` property from `buildKafkaMessage`. This ensures all listeners receive event properties like `type` and `data` at the top level, fixing a systemic issue where listeners were receiving `undefined` for these fields.
- **Service Standardization**: Refactored `TeamServiceImpl` to use the unified `EventBus` abstraction, eliminating double-stringification bugs and bringing it in line with the Project and Task services.
- **Actor vs. Subject Distinction**: Corrected the `ProjectService` to properly distinguish between the **Actor** (the admin performing the action) and the **Subject** (the user being added or removed) in Kafka payloads. This ensures listeners correctly target the subject for cleanup rather than the actor.


---

# Entry 12: Event Cleanup Strategy — Choreography vs. Orchestration

## Global vs. Targeted Cleanup

The system employs a hybrid event-driven strategy to handle data consistency across domain boundaries, balancing between **Event Choreography** and **Targeted Orchestration**.

### 1. Global Cleanup (Choreography)
For "Root" events like `PROJECT_DELETED`, we use a **Broadcast-and-React** pattern. Instead of a cascading chain (Project -> Team -> Member -> Task), every interested service listens directly to the `PROJECT_DELETED` signal.

*   **Benefits**:
    *   **Parallelism**: Services clean up their respective tables simultaneously, significantly reducing the total time for a project wipe.
    *   **Resilience**: The Task service doesn't depend on the Team service to "forward" the deletion. If one service is down, others still complete their cleanup, preventing "zombie data."
    *   **No Event Storms**: We avoid generating thousands of individual "Task Deleted" events when a single "Project Deleted" signal achieves the same goal more efficiently.

### 2. Targeted Cleanup (Surgical Strike)
For sub-entity deletions (e.g., deleting a single Team or removing one Member), we use a **Targeted Command** pattern.

*   **Flow**: `TeamServiceImpl.deleteTeams` -> `PROJECT_TEAM_DELETED` -> `TaskService` unassigns only that team's tasks.
*   **Logic**: This ensures that surgical changes in one domain are correctly reflected in others without requiring a full project-level sweep.

### Architectural Verdict
This hybrid approach provides the best of both worlds: high-throughput bulk deletions for project-level actions and precise, decoupled consistency for day-to-day entity management. It maintains strict module boundaries while ensuring the system remains resilient to partial failures.


---

# Entry 13: Scalable Idempotency for 10k RPS

## Solving Duplicate Delivery and Out-of-Order Events

As the system scales to 10,000 RPS, traditional idempotency checks (like simple `last_event_id` columns) become insufficient. We implemented a robust, high-performance idempotency architecture.

### 1. The "Processed Events" Table (Primary Check)
We introduced a dedicated `processed_event` table that tracks `(event_id, consumer_group)`. This table acts as a **Transactional Inbox**, ensuring that no matter how many times Kafka delivers an event, it is only executed once by each logical consumer group.

*   **Atomicity**: The check and the business logic are wrapped in a single database transaction using a `withIdempotency` helper.
*   **Performance**: It uses `INSERT ... ON CONFLICT DO NOTHING RETURNING event_id` to achieve lightning-fast lookups and insertions in a single round-trip.
*   **Support for Deletes**: Unlike entity columns, this separate table persists even after the main entity (like a Task) has been deleted, preventing duplicate delete logic.

### 2. Entity-Level "last_event_id" (Secondary Check)
We also added a `last_event_id` column to all main entity tables (`Project`, `Team`, `Task`). 

*   **Purpose**: This provides a secondary layer of protection specifically for **Out-of-Order Updates**. It allows us to compare the incoming event's timestamp or version against the current record, ensuring an older event never overwrites newer data.

### 3. Scaling to 10k RPS
To ensure the `processed_event` table doesn't become a bottleneck:
*   **Composite Primary Key**: Ensures the index lookup is O(log n).
*   **Partitioning Recommendation**: For production, this table should be partitioned by `processed_at` (e.g., daily partitions). This keeps the active index in RAM and allows for instant purging of old data without vacuum overhead.
*   **TTL Strategy**: Idempotency records only need to be kept as long as the Kafka retention period (e.g., 7 days). After that, the old partitions are simply dropped.

