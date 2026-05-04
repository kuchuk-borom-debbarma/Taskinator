## 3. SYSTEM ANALYSIS AND DESIGN

To achieve the goals of high throughput and extreme scalability, Taskinator follows a strict "non-blocking" full-stack architectural philosophy. This philosophy mandates minimizing synchronous wait times at every possible layer of the application. 

### 3.1 Overall System Architecture
The overarching system architecture of Taskinator is constructed as a **Modular Monolith** underpinned by an **Event-Driven Architecture (EDA)** backbone. This hybrid approach provides the deployment simplicity and operational ease of a monolithic application while simultaneously enforcing the strict domain boundaries, loose coupling, and horizontal scalability characteristic of microservice architectures.

![img](diagrams/diagram_system_overview.png)
*Figure 3.1: Full-Stack Layered Architecture and Data Flow — Taskinator*

The architecture is physically and logically divided into five distinct operational layers:
1. **Layer 1 (Client Presentation):** The React 18 Frontend, featuring the highly interactive Task Graph visualization powered by D3.js, and Apollo Client for normalized state management. It connects to the backend via HTTP POST for queries and mutations, and utilizing Server-Sent Events (SSE) for unidirectional real-time data ingestion.
2. **Layer 2 (API Gateway):** The GraphQL server (Apollo Server). This layer handles JWT authentication, validates incoming JSON payloads, and resolves incoming mutations into typed backend service calls.
3. **Layer 3 (Application Backend Modules):** The core Node.js application, internally subdivided into strongly cohesive domain modules (Project, Task, Team, User). It includes the Outbox Relay for reliable transactional event publishing and dedicated Kafka Consumers for asynchronous background processing.
4. **Layer 4 (Data Storage & Streaming):** PostgreSQL 16 serves as the primary, persistent source of truth. Apache Kafka acts as the high-throughput, horizontally partitioned event bus bridging the synchronous mutators with the asynchronous side-effect workers.
5. **Layer 5 (Real-Time Routing):** Redis Pub/Sub operates as a highly volatile, ephemeral routing table, mapping active user websocket/SSE sessions to specific backend server instances for zero-fan-out message delivery.

#### 3.1.1 End-to-End Orchestration Lifecycle
To truly understand the power of the non-blocking architecture, we must trace a complex user operation completely through the stack. Consider the scenario where a user creates a dependency linking two existing tasks (Task A is marked as a dependency blocking Task B). The operation executes in milliseconds through the targeted event routing pipeline:

1. **The API Request:** The client executes a GraphQL mutation `createTaskLink` to link the tasks.
2. **Atomic Write (wCTE):** The backend API executes a single Data-Modifying Common Table Expression (wCTE). This atomic query verifies RBAC permissions, inserts the physical link into `task_link`, and inserts a `TASK_LINK_CREATED` JSON payload into the `outbox_events` table simultaneously.
3. **Immediate HTTP Response:** The database commits the transaction. The API instantly returns an HTTP 200 OK status to the client. The synchronous blocking path is now complete.
4. **Reactivity:** Upon commit, PostgreSQL fires a `pg_notify` event. The idle Outbox Relay immediately wakes up and claims the newly inserted event using a `SELECT ... FOR UPDATE SKIP LOCKED` query.
5. **Partitioned Publishing:** The relay publishes the serialized event to Kafka, partitioning the message utilizing the `projectId` to maintain strict causal ordering across the distributed topic.
6. **Parallel Execution:** Once buffered in Kafka, multiple distinct consumer pipelines process the event simultaneously:
   - The **Smart Aggregator** folds the event to update any denormalized analytics counts on the Project entity.
   - The **Reachability Engine** reads the event, calculates the necessary graph traversals, and expands the Closure Table to allow rapid future read queries.
   - The **Real-Time Router** queries Redis for active connections, pushing the specific payload only to the Node instances serving project stakeholders, triggering an instant UI re-render on their devices.

### 3.2 Domain Modeling and ER Schema
Taskinator's domain model is strictly relational, explicitly designed to support massive datasets without resorting to unstructured NoSQL patterns, ensuring rigid data integrity and referential safety.

![img](diagrams/diagram_domain_model.png)
*Figure 3.2: Core Domain Entity-Relationship (ER) Model*

The core entities within the database schema are highly optimized for distinct read/write patterns:
- **`project`**: Acts as the bounding context for almost all queries. Contains heavily denormalized integer counters (e.g., `task_count`, `completed_task_count`) to avoid expensive table scans.
- **`project_task`**: The central operational entity. It utilizes a `materialized_path` (TEXT) for flat hierarchical indexing and a `version` (INT) column to enforce optimistic concurrency control across distributed writes.
- **`task_link`**: Represents the directed edges (dependencies) between tasks. It is fundamentally distinct from the parent/child hierarchy, allowing a task to block or relate to tasks located anywhere else within the overarching project graph.
- **`task_reachability`**: The transitive closure index mapping every ancestor task to every descendant task. It deliberately operates without a surrogate primary key to reduce index bloat, utilizing a composite key of `(fk_project_id, ancestor_task_id, descendant_task_id)`.
- **`outbox_events`**: The ephemeral transactional log table responsible for bridging ACID database transactions with the eventual consistency of the Kafka event bus.

### 3.3 Database Optimization & Denormalization
Before detailing the Kafka event pipelines, it is crucial to understand the foundational data layer optimizations applied directly within PostgreSQL that enable the high baseline throughput.

#### 3.3.1 Task Reachability Engine: Custom Closure Tables
To support infinite task nesting and complex DAG (Directed Acyclic Graph) dependencies, Taskinator rejects slow recursive `WITH RECURSIVE` queries in favor of a Custom Closure Table architecture. The `task_reachability` index stores every possible path from every ancestor to every descendant in the graph, tracking the exact depth (number of hops).

![img](diagrams/diagram_closure_table_math.png)
*Figure 3.3: Task Reachability Engine — Closure Table Cross-Join Expansion*

**Cross-Join Expansion Mathematics:**
When a user creates a new dependency linking Task A as a parent of Task B, the engine cannot simply insert a single row. It must query the closure table for all tasks that reach A (the Ancestors) and all tasks reached by B (the Descendants). 
Every discovered ancestor must now be able to reach every discovered descendant. If Task A has 5 ancestors and Task B has 10 descendants, the system calculates the Cartesian product: $5 \times 10 = 50$ new paths. The new depth is calculated mathematically as: `Depth(Ancestor -> A) + 1 + Depth(B -> Descendant)`. 
By proactively maintaining this matrix during write operations, the React Task Graph can fetch the entire dependency tree of a massive project in a single, index-backed $O(1)$ read query. The normally catastrophic write amplification factor of Closure Tables is entirely mitigated by calculating these cross-joins asynchronously within the Kafka consumer pipeline.

#### 3.3.2 Optimistic Locking & Concurrency Control
In a high-throughput collaborative environment, multiple users, automation engines, or background services may attempt to update the same task simultaneously. Instead of acquiring pessimistic database locks (`SELECT ... FOR UPDATE`), which block concurrent reads and severely limit throughput, the system employs **Optimistic Locking**.

Every mutable record in the database includes an integer `version` column. When a client reads a task, it receives the data alongside its current version (e.g., `version = 1`). When the client attempts an update via GraphQL, it sends the mutation including a `WHERE version = 1` clause. 
If another client successfully updated the task in the meantime, the version in the database will have incremented to `2`. The subsequent update query will fail, returning 0 modified rows. The Kysely query builder catches this, rejects the stale update, throws a `ConcurrencyError`, and forces the client to reconcile and retry. This guarantees absolute data integrity without ever implementing read-blocking locks at the database level.

#### 3.3.3 CTE-Based Atomic Authorization
To avoid executing multiple roundtrips to an external authorization table for every single mutation request, RBAC (Role-Based Access Control) security is baked directly into the SQL mutation utilizing Common Table Expressions (CTEs):

```sql
WITH auth_check AS (
    SELECT 1 FROM project_member 
    WHERE fk_project_id = $1 AND fk_user_id = $2
)
UPDATE project_task SET title = $3
WHERE id = $4 AND EXISTS (SELECT 1 FROM auth_check)
RETURNING *;
```

This strategy achieves single-trip atomic security. If the user lacks the necessary permissions, the `EXISTS` clause fails instantly, and the update is safely and silently aborted at the database engine level, saving valuable Node.js CPU cycles and reducing network latency.

#### 3.3.4 Strategic Denormalization & Delta Processing
Calculating the total number of pending tasks in a project dynamically requires an extremely expensive `COUNT(*)` query scanning potentially millions of rows. Taskinator denormalizes this value directly onto the Project entity (`project.task_count`).
Crucially, when a task is created, the system does not execute a recalculation query. Instead, an event is fired into Kafka. A background aggregator calculates the mathematical delta (`+1`) and asynchronously executes an `UPDATE project SET task_count = task_count + 1`. This purely delta-based approach prevents expensive table scans entirely and allows the analytics dashboard to load instantly.
