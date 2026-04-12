# Taskinator Architecture Documentation

Welcome to the Taskinator architecture documentation. This section provides an in-depth look at the system design, core patterns, and technological choices.

## Features

Taskinator is a high-performance orchestration engine designed for complex project and task management. Its key features include:

### Project & Team Management
- **Project Creation**: Users can create and manage multiple projects.
- **Member Management**: Add and manage members within a project.
- **Team Organization**: Create teams within projects and assign project members to specific teams.

### Task Management
- **Hierarchical Tasks**: Support for tasks and sub-tasks (children of tasks) allowing for deep nesting and complex work breakdown structures.
- **Task Assignment**: Assign tasks to entire teams or individual team members for clear accountability.

### Automations & Triggers
- **Automations**: Implement logic that automatically executes based on specific events.
- **Notifications**: Automatically notify relevant stakeholders when a task's status changes.
- **Parent Guard Triggers**: Advanced triggers based on the state of parent or child tasks to ensure workflow integrity.

## Goals

Taskinator is built with the following primary objectives:

- **Large Scalability**: The system is designed to scale horizontally to handle growing numbers of users, projects, and tasks without performance degradation.
- **High Throughput**: Engineered to support high-frequency operations, targeting a high Requests Per Second (RPS) threshold (e.g., 10k RPS) to maintain responsiveness under heavy load.

## Architecture

To achieve the goals of high throughput and large scalability, Taskinator follows a "non-blocking" architectural philosophy, minimizing synchronous wait times and offloading intensive tasks.

### Core Philosophy: Non-Blocking & Asynchronous Execution
- **Event-Driven Architecture (EDA)**: Operations that don't require immediate feedback are offloaded into "branch-offs" using an event-driven approach. This ensures the main execution path remains fast and responsive.
- **Async Coding**: Heavy reliance on asynchronous programming patterns to prevent blocking the event loop or worker threads.
- **Batch-First Processing**: Instead of processing items one-by-one, we prioritize batching and bulk operations at every level—from database inserts to event publishing and consumption. This significantly reduces overhead and increases throughput.

### Schema Optimization & Performance
- **Denormalization**: To avoid expensive joins and multi-table lookups, we strategically denormalize columns based on common client data requirements. 
- **Eventual Consistency**: Denormalized values are updated asynchronously, favoring system throughput over immediate global consistency.
- **Hierarchical Data (Materialized Paths)**: For nested structures like tasks and sub-tasks, we use **Materialized Paths**. While Closure Tables were considered, Materialized Paths offer a better balance of simplicity and performance by avoiding excessive row growth in mapping tables.

### In-Memory Strategies
- **Caching**: Extensive use of in-memory caching and Redis to reduce database load.
- **Future Considerations**: Exploring the use of Bloom filters for fast existence checks and in-memory database layers (RAM-first writes synced to disk) for extreme performance, balancing cost vs. speed.

In summary, the architecture is centered on **async execution**, **in-memory shifting**, **targeted denormalization**, and **pervasive batching** to meet our 10k RPS targets.

## Event-Driven Architecture (EDA)

The Event-Driven Architecture is the backbone of Taskinator's asynchronous processing. It allows us to offload non-critical tasks from the main execution path.

### Ordering & Partitioning
To maintain system consistency, the order of events is crucial. We use **Project-Level Partitioning** to ensure that all events related to a specific project are processed in the correct sequence.
- **Partition Key**: We use `projectId` as the partition key. 
- **Rationale**: Since most operations in Taskinator occur within the context of a project, ensuring strict ordering at the project level is sufficient. This allows for horizontal scaling across different projects while maintaining consistency within each one.

### Pervasive Batching
Batching is a first-class citizen in our EDA implementation to maximize efficiency:
- **Event Publishing**: Events are collected and published in batches rather than individually.
- **Batch Consumers**: Listeners and consumers are designed to accept and process arrays of events, reducing the overhead of per-event handling.
- **Service Integration**: Domain services are architected to handle bulk data operations, ensuring that the entire pipeline—from the API down to the event consumers—is optimized for high-volume throughput.

### Idempotency
To ensure that an event is not processed more than once, we implement strict **Idempotency**.
- **Unique Event IDs**: Every event is assigned a unique identifier (UID).
- **Duplicate Prevention**: If an event is accidentally fired or received more than once, the system checks the UID against a record of processed events. If the UID has already been processed, the duplicate event is safely discarded. This guarantees that each event's side effects occur exactly once, even in the face of network retries or producer failures.

### Recursive Event Loops & Safety Nets
In a complex orchestration engine like Taskinator, actions often trigger cascading effects. For example, updating a task might trigger an automation that, in turn, updates another task. This creates a **Recursive Event Loop**.

#### The Challenge: Infinite Recursion
Without proper safeguards, a recursive loop can become infinite (e.g., Task A updates Task B, which updates Task A), leading to system instability and resource exhaustion.

#### The Solution: System-Level Identity & Origin Tracking
To manage recursion safely, we distinguish between user-initiated actions and system-initiated actions.
- **Origin Tracking**: Every event carries a `userId`. 
- **System Actor**: When a background service or automation (like the Trigger Engine) performs an update, it identifies itself as the **'SYSTEM'** user.
- **Safety Gate**: Consumers that trigger further updates are designed to ignore events originated by the 'SYSTEM' user unless explicitly designed otherwise. This "breaks" the cycle and prevents infinite loops.

### Recursive Cascades (The Bubbling Effect)
Some operations require a "bubbling" or cascading effect that traverses the task hierarchy. A prime example is **Recursive Task Deletion**.

#### Scenario: Deleting a Root Task
When a user deletes a task that has hundreds of nested sub-tasks, we cannot delete them all in a single synchronous request without risking a database timeout or blocking the event loop. Instead, we use a recursive event-driven cascade.

1.  **The Trigger**: A user deletes a task. The system marks it as deleted and fires a `project.task.parent.deleted` event.
2.  **The Recursive Worker**: The `TaskDeleteListener` consumes this event. It identifies the direct children of the deleted task using the `materialized_path`.
3.  **Batch Execution**: It deletes the first batch (e.g., 100) of children.
4.  **Bubbling Down**: For every batch deleted, the listener fires a NEW `project.task.parent.deleted` event for the children it just removed.
5.  **Completion**: This process continues "bubbling down" the tree, level by level, until all descendants are purged. 

#### Rationale
- **Resource Protection**: By breaking a massive deletion into small, asynchronous batches, we protect the database from long-lived locks.
- **Horizontal Throughput**: Different partitions can handle different branches of the deletion tree simultaneously, maximizing throughput.
- **Visual Feedback**: The system remains responsive; the user sees the root task disappear immediately, while the "heavy lifting" of cleaning up thousands of sub-tasks happens in the background.

### Transactional Outbox Pattern
The **Transactional Outbox Pattern** is used to ensure reliable event delivery and maintain consistency between the primary database and the event bus (Kafka).

#### The Problem: Reliable Publishing
In a distributed system, a common failure point is crashing after a database update but before the corresponding event is published to the bus. This leaves the system in an inconsistent state where the data is updated, but secondary actions (like notifications or cascading cleanups) never occur.

#### The Solution: Outbox Table
- **Atomicity**: We use a dedicated `outbox` table to store events. The main business operation and the event creation are performed in a **single database transaction** (often using Common Table Expressions - CTEs for efficiency).
- **Partitioning**: The `outbox` table is partitioned by time to ensure high-performance writes and efficient cleanup of processed events.
- **Outbox Relay (Poller)**: A dedicated background service (the Outbox Relay) continuously polls the `outbox` table for new events and publishes them to the event bus.
- **Delete-on-Success**: Once an event is successfully published to the bus, it is deleted from the `outbox` table.

#### Resilience & Scaling
- **At-Least-Once Delivery**: This pattern guarantees that every event is published at least once. If the relay crashes after publishing but before deleting from the DB, the event will be re-fetched and re-published.
- **Handling Duplicates**: Because we use the event's UID as its idempotency key, any duplicates produced by the outbox relay (due to crashes or horizontal scaling where multiple relays might pick up the same event) are safely discarded by the consumers.

### Low-Level Design (LLD) - EDA Implementation

This section details the precise mechanics of how we achieve atomicity, high throughput, and exactly-once processing.

#### 1. Atomic Writes via wCTE (Write Common Table Expression)
To avoid the overhead of multi-statement `BEGIN...COMMIT` blocks and ensure atomicity in a single database roundtrip, we use **Data-Modifying CTEs**.

```sql
WITH inserted_task AS (
    INSERT INTO tasks (id, project_id, title, version)
    VALUES ($1, $2, $3, 1)
    RETURNING *
)
INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
SELECT 
    'project.task.created', 
    project_id, 
    json_build_object('id', id, 'title', title)
FROM inserted_task;
```
- **Benefit**: This guarantees that the event is written if and only if the task is written, without the performance penalty of traditional transactions.

#### 2. The Outbox Relay (Poller)
The Outbox Relay is a lightweight background worker that bridges the database and Kafka.
- **Polling Strategy**: It selects `PENDING` events from `outbox_events` in batches (e.g., 100 at a time) ordered by `created_at`.
- **Batch Publishing**: It groups events by topic and publishes them to Kafka in parallel.
- **Hard Delete**: Once Kafka acknowledges the publish, the relay issues a `DELETE FROM outbox_events WHERE id IN (...)`. This keeps the table size near zero and prevents the "large table" performance degradation typical of polling patterns.

#### 3. Partitioning and Ordering
- **Kafka Key**: Every event is published with the `projectId` as the Kafka message key.
- **Guarantee**: Kafka ensures that all messages with the same key are routed to the same partition. Since partitions are consumed sequentially, we guarantee that all events for a specific project are processed in their exact order of occurrence.

#### 4. The Idempotency Engine
Consumer-side safety is handled by a specialized `processed_event` table.

```typescript
// Optimized Batch Idempotency Check
const results = await db
    .insertInto('processed_event')
    .values(events.map(e => ({
        event_id: e.eventId,
        consumer_group: groupId,
        processed_at: now()
    })))
    .onConflict(oc => oc.doNothing())
    .returning('event_id')
    .execute();

const approvedEvents = events.filter(e => 
    results.some(r => r.event_id === e.eventId)
);
```
- **Logic**: We use `INSERT ... ON CONFLICT DO NOTHING RETURNING`. The `RETURNING` clause only returns the IDs of the rows that were *actually* inserted. 
- **Efficiency**: This allows us to "claim" a batch of events in a single O(1) query, discarding duplicates before any expensive business logic is executed.

#### 5. Recursive Trigger Example (Safety Net in Action)
To see how we prevent infinite loops, let's look at the **Task Trigger** workflow:

1.  **Initial Update**: A user updates a Task to 'DONE'. An event is written with `userId: 'u123'`.
2.  **Trigger Delegation**: `ProjectTaskUpdatedListener` sees `userId: 'u123'`, fetches triggers, and publishes a `trigger.trigger` event.
3.  **Trigger Execution**: `TaskTriggerListener` runs `blockParentDoneTrigger`. If children are incomplete, it reverts the status via `updateTaskStatus`.
4.  **System Write**: `updateTaskStatus` writes a NEW `project.task.updated` event, but explicitly sets **`userId: 'SYSTEM'`**.
5.  **Termination**: `ProjectTaskUpdatedListener` receives the 'SYSTEM' event, hits the safety gate (`if (userId === 'SYSTEM') return`), and stops.

## Real-time System (Targeted Routing)

To support 10k RPS and thousands of concurrent users, Taskinator employs a **Targeted Routing** pattern for real-time updates via GraphQL Subscriptions (using Server-Sent Events - SSE). 

### High-Level Overview
In a distributed cluster, a user's real-time connection (SSE/WebSocket) is "sticky" to a specific server instance. When an event happens elsewhere in the system, we need a way to find exactly which server instance holds that user's connection and deliver the update only to that instance.

#### Core Components
- **Instance ID**: Every server node generates a unique `INSTANCE_ID` on boot.
- **Redis Routing Table**: A volatile, in-memory map in Redis that tracks which users/projects are connected to which `INSTANCE_ID`.
- **Targeted Pub/Sub**: Instead of broadcasting every event to every server (naive fan-out), we use Redis to route events directly to the specific server nodes that need them.

### Why this Scales
1.  **Zero Unnecessary Network Traffic**: If an event occurs in a project where no users are currently online, the system detects this via Redis and drops the event immediately.
2.  **Kafka Efficiency**: Kafka only delivers a message to a single "Router" instance in the cluster. This instance then handles the targeted distribution via Redis.
3.  **Horizontal Scalability**: We can add thousands of "Connection Nodes" to handle sticky TCP pipes without increasing the load on the Kafka backbone.

### Low-Level Design (LLD) - Targeted Routing

#### 1. Connection Lifecycle (Registration)
When a client connects to a GraphQL subscription, the server registers its presence in Redis.

```typescript
// Inside Subscription Resolver
const subscriptionKey = `route:project:${projectId}`;

// 1. Register this instance as a listener for this project
await redis.sadd(subscriptionKey, INSTANCE_ID);

try {
    yield* pubsub.subscribe(localTopic);
} finally {
    // 2. Clean up on disconnect
    await redis.srem(subscriptionKey, INSTANCE_ID);
}
```

#### 2. The Real-time Router (Kafka Consumer)
A dedicated Kafka consumer acts as the "Air Traffic Controller" for real-time events.

1.  **Consume**: It receives a `TaskUpdated` event for `Project A` from Kafka.
2.  **Lookup**: It queries Redis: `SMEMBERS route:project:ProjectA`.
3.  **Route**: If Redis returns `["server-1", "server-5"]`, the router publishes the payload specifically to those two channels:
    ```typescript
    redis.publish('instance:server-1', payload);
    redis.publish('instance:server-5', payload);
    ```

#### 3. Local Bridge Executor
Every server instance subscribes to its own unique Redis channel: `instance:${INSTANCE_ID}`.

```typescript
redisSubscriber.subscribe(`instance:${INSTANCE_ID}`, (message) => {
    const payload = JSON.parse(message);
    // Inject the event into the LOCAL memory pubsub
    // This finally delivers the data to the user's open SSE connection
    localPubSub.publish(payload.topic, payload.data);
});
```

## Database Optimization

To achieve 10k RPS, the database cannot be a bottleneck. We employ several strategies to minimize query complexity, reduce roundtrips, and handle complex data structures efficiently.

### Hierarchical Data: Materialized Paths

Taskinator allows for infinitely nested tasks and sub-tasks. Choosing the right way to represent this tree structure in a relational database is critical for performance.

#### High-Level Overview
We use **Materialized Paths** (also known as Path Enumeration) to store the hierarchy. Each task stores its full ancestry as a string of IDs (e.g., `root_id/parent_id/current_parent_id`).

#### Why not Adjacency Lists or Closure Tables?
- **Adjacency Lists (`parent_id`)**: Simple, but requires recursive CTEs or multiple queries to find all descendants, which is slow for deep trees.
- **Closure Tables**: Very fast for querying, but writes are expensive as they require O(n) rows per task, where n is the depth. In a 10k RPS system, this write amplification is unacceptable.
- **Materialized Paths**: Offers a perfect balance. Finding all descendants is a single `LIKE` query, and moving a sub-tree requires updating only the affected paths.

#### Key Advantages
- **Single-Query Fetches**: Fetching an entire sub-tree or counting all incomplete descendants happens in one index-backed trip.
- **Breadcrumb Generation**: The path itself acts as a breadcrumb, making it easy for the frontend to render the hierarchy without extra lookups.

#### Edge Cases & Challenges
- **Path Length Limits**: Using UUIDs in paths can lead to long strings. We use standard text columns to handle deep nesting (up to 50 levels).
- **Sub-tree Moves**: When a parent task moves to a new project or parent, all its descendants' paths must be updated. We handle this via asynchronous event-driven updates to prevent blocking the main move operation.

#### Low-Level Design (LLD) - Materialized Paths

##### 1. Schema Definition
The `materialized_path` is an indexed text column.

```sql
CREATE TABLE project_task (
    id UUID PRIMARY KEY,
    materialized_path TEXT NOT NULL DEFAULT '',
    -- other columns...
);

CREATE INDEX idx_project_task_path ON project_task (materialized_path text_pattern_ops);
```
*Note: `text_pattern_ops` is used to optimize `LIKE 'path/%'` queries.*

##### 2. Querying Descendants
To find all descendants of a task (e.g., to count incomplete sub-tasks), we use a single efficient query:

```sql
SELECT count(*) 
FROM project_task 
WHERE materialized_path LIKE (
    SELECT CASE 
        WHEN materialized_path = '' THEN id::text || '%'
        ELSE materialized_path || '/' || id::text || '%'
    END 
    FROM project_task 
    WHERE id = $1
) AND status != 'DONE';
```

##### 3. Calculating Path on Insert
When a child task is created, its path is derived from the parent's path + the parent's ID.

```typescript
const parentPath = parent.materializedPath === '' 
    ? parent.id 
    : `${parent.materializedPath}/${parent.id}`;
```

### Optimistic Locking (Distributed Race Condition Prevention)

In a high-throughput distributed system like Taskinator, multiple services or users might attempt to update the same record (e.g., a Task) simultaneously. Without proper concurrency control, this leads to **"Lost Updates,"** where one update accidentally overwrites another.

#### High-Level Overview
Instead of using heavy database-level locks (Pessimistic Locking) which would block concurrent reads and scale poorly, we use **Optimistic Locking**. 

This approach assumes that conflicts are rare. Every record has a `version` column. When an update is performed, the system checks if the version has changed since it was last read. If the versions don't match, the update is rejected, signaling a conflict.

#### Why it's Critical for Distributed Systems
1.  **Non-Blocking Reads**: Services can read data without acquiring locks, maximizing throughput.
2.  **Conflict Detection at Scale**: When horizontally scaled, multiple instances of a service can attempt updates. Optimistic locking ensures only the first one to reach the database succeeds.
3.  **Data Integrity**: It prevents stale data from being used in critical business logic (e.g., a background automation reverting a status based on a version of the task that was already updated by a user).

#### Handling Conflicts (The "Stale Update" Scenario)
When an update fails due to a version mismatch, the system typically:
- **Returns an Error**: Informs the user/client that the data has changed.
- **Client-Side Resolution**: The client (or calling service) fetches the latest version, reapplies the changes (if appropriate), and retries the update with the new version number.

#### Low-Level Design (LLD) - Optimistic Locking

##### 1. The Update Pattern
Every update operation includes the `version` in the `WHERE` clause and increments it in the `SET` clause.

```sql
UPDATE project_task
SET status = 'DONE',
    version = version + 1,
    updated_at = NOW()
WHERE id = $1
  AND version = $2 -- The version the client/service last read
RETURNING *;
```

##### 2. Success vs. Failure
- **Success**: If the record exists with version `$2`, the update succeeds, and `RETURNING *` provides the new state (with `version = $2 + 1`).
- **Failure**: If another process updated the record first, the `WHERE` clause will fail to match any rows. The database returns "0 rows affected."

##### 3. Implementation in TypeScript/Kysely
We check the result of the execution to determine if the update was successful or if a race condition occurred.

```typescript
const result = await db
    .updateTable('project_task')
    .set({
        status: 'DONE',
        version: sql`version + 1`
    })
    .where('id', '=', taskId)
    .where('version', '=', expectedVersion)
    .returningAll()
    .executeTakeFirst();

if (!result) {
    throw new Error('CONFLICT_ERROR: Task was modified by another process.');
}
```

### CTE-Based Authorization (Atomic Security)

To maintain high throughput, we avoid making multiple roundtrips to an external Authorization service or even to separate tables for permission checks. Instead, we bake security directly into our SQL queries using **Common Table Expressions (CTEs)**.

#### High-Level Overview
Every mutation or sensitive query includes an "Auth Check" CTE. This CTE verifies if the user has the necessary permissions (e.g., is a project owner or member) in the same atomic database trip as the business logic.

#### Key Advantages
- **Single Roundtrip**: One network trip handles authentication, authorization, and the business operation.
- **Atomic Integrity**: If the user loses permission between the start and end of a request, the database-level check ensures the operation fails instantly.
- **SQL-Level Enforcement**: Authorization isn't just a middleware check; it's a hard requirement in the `WHERE` clause of the update/delete.

#### Low-Level Design (LLD) - CTE Authorization

```sql
WITH auth_check AS (
    -- Rule 1: User is the Project Owner
    SELECT 1 FROM project WHERE id = $1 AND fk_user_id = $2
    UNION ALL
    -- Rule 2: User is a Project Member
    SELECT 1 FROM project_member WHERE fk_project_id = $1 AND fk_user_id = $2
    LIMIT 1
),
updated_task AS (
    UPDATE project_task
    SET title = $3
    WHERE id = $4
      AND EXISTS (SELECT 1 FROM auth_check) -- Hard Gate
    RETURNING *
)
SELECT * FROM updated_task;
```

### Schema Denormalization (Read-Path Optimization)

In a traditional relational database, data is normalized to reduce redundancy. However, in a high-throughput system targeting 10k RPS, the cost of joining multiple tables (e.g., Joining `project_task` with `project` and `project_team` for every read) can become a performance bottleneck.

#### High-Level Overview
**Denormalization** is the process of strategically adding redundant data to one or more tables to speed up complex queries. We trade off a small amount of storage and write complexity for significantly faster reads.

**Note:** As of the current development phase, we have **not yet implemented** widespread denormalization. This is a deliberate architectural choice to keep the schema clean while we finalize the core domain logic. We will determine the exact fields to denormalize based on real-world client data requirements and bottleneck analysis during load testing.

#### Core Rationale
- **Avoid Expensive Joins**: By pulling frequently accessed data from related tables into a single row, we can serve complex UI views with a simple `SELECT *` from one table.
- **Improved Cache Locality**: Keeping related data in the same physical row (or page) improves database cache performance.
- **Eventual Consistency**: Denormalized fields are updated asynchronously via the Event-Driven Architecture, ensuring that the primary write path remains fast.

#### Low-Level Design (LLD) - Denormalization Strategy

##### 1. Potential Candidate: The Task Feed
A common view requires showing a list of tasks along with their Project Name and Assigned Team Name.

**Normalized Query (Current):**
```sql
SELECT t.*, p.name as project_name, tm.name as team_name
FROM project_task t
JOIN project p ON t.fk_project_id = p.id
LEFT JOIN project_team tm ON t.fk_team_id = tm.id
WHERE t.fk_project_id = $1;
```

**Denormalized Schema (Planned):**
We would add `project_name` and `team_name` directly to the `project_task` table.

```sql
ALTER TABLE project_task 
ADD COLUMN denormalized_project_name TEXT,
ADD COLUMN denormalized_team_name TEXT;
```

---

## System Services

### Internal Notification Service (Scalable Inbox)

Taskinator includes a high-throughput internal notification system designed to handle thousands of alerts per second without degrading the performance of the core task engine.

#### High-Level Overview: Bucket-per-User Partitioning
Instead of a single massive table for all notifications, which would become a bottleneck, we use **Time-Range Partitioning** (Bucketing).

#### Rationale
- **Efficient Cleanup**: Deleting old notifications is a metadata operation (dropping a partition) rather than a slow row-by-row `DELETE`.
- **Index Locality**: By partitioning by time (e.g., yearly/monthly), the active "working set" of unread notifications remains small and fits easily in RAM.

#### Low-Level Design (LLD) - Notification Partitioning

##### 1. Partitioned Schema
```sql
CREATE TABLE internal_notification (
    id UUID NOT NULL,
    fk_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    -- ...
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Year-based bucket
CREATE TABLE internal_notification_y2026 PARTITION OF internal_notification
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

##### 2. Optimized Feed Indexing
We use specialized partial indexes to ensure that a user's unread feed is always near-instant, regardless of how many total notifications exist.

```sql
-- Fast lookup for the "Unread Count" badge
CREATE INDEX idx_notification_unread ON internal_notification(fk_user_id) 
WHERE is_read = FALSE;

-- Fast lookup for the "Inbox" view
CREATE INDEX idx_notification_feed ON internal_notification(fk_user_id, created_at DESC);
```
