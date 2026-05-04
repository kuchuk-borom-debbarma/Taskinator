## 4. EVENT-DRIVEN PIPELINE (EDA) IMPLEMENTATION

The foundational backbone of Taskinator is its highly tuned Event-Driven Architecture (EDA). This architecture rejects synchronous side-effect processing entirely, instead utilizing pervasive batching strategies that begin all the way upstream at the producer level and carry through to the downstream consumers.

### 4.1 The Transactional Outbox Pattern & wCTE
A classic, well-documented failure mode in distributed systems occurs when a database transaction successfully commits, but the application Node.js process crashes milliseconds before publishing the resulting domain event to Apache Kafka. This creates a ghost state: the data exists in the database, but downstream systems (analytics, search indexing, real-time UIs) are completely unaware, leaving the system permanently inconsistent. 

Taskinator utilizes the **Transactional Outbox Pattern** to guarantee absolute atomic writes without dual-write failures.

![img](diagrams/diagram_outbox_pattern.png)
*Figure 4.1: Transactional Outbox Workflow using wCTE*

While traditional Outbox implementations execute multiple sequential SQL `INSERT` statements within a `BEGIN...COMMIT` block, Taskinator optimizes this using PostgreSQL's Data-Modifying Common Table Expressions (wCTE). A single SQL query uses `WITH` clauses to insert the business data and immediately insert the serialized JSON payload into the `outbox_events` table simultaneously:

```sql
WITH inserted_task AS (
  INSERT INTO project_task (id, fk_project_id, title, status, version) 
  VALUES ($1, $2, $3, $4, 1) 
  RETURNING *
),
inserted_event AS (
  INSERT INTO outbox_events (aggregate_id, event_type, payload) 
  VALUES (
    (SELECT id FROM inserted_task), 
    'TASK_CREATED', 
    jsonb_build_object('id', (SELECT id FROM inserted_task), 'status', $4)
  )
)
SELECT * FROM inserted_task;
```

If the transaction rolls back due to a constraint violation or a server crash mid-flight, both the task and the event are safely discarded by the database engine. They succeed or fail as a singular, indivisible unit of work, requiring only one network roundtrip.

### 4.2 Concurrent Outbox Relays: Mitigating the Thundering Herd
Traditional outbox relays utilize primitive `setInterval` loops to aggressively poll the database for new events. At 10,000 RPS, this creates severe database CPU load even when the system is idle. 

Taskinator discards polling entirely in favor of reactivity. The Outbox Relay connects via the `pg` driver and executes a persistent `LISTEN outbox_event_notification` command. When the aforementioned wCTE commits, PostgreSQL natively pushes a highly efficient, lightweight notification through the socket.

However, in a horizontally scaled Kubernetes environment, this reactivity creates a catastrophic **"Thundering Herd"** problem: 50 different relay pods wake up simultaneously to grab the exact same batch of events.

![img](diagrams/diagram_thundering_herd.png)
*Figure 4.2: Concurrent Outbox Polling: Mitigating the Thundering Herd with SKIP LOCKED*

To solve this, Taskinator utilizes the advanced `FOR UPDATE SKIP LOCKED` database directive. 
When the notification fires, Pod 1 executes `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 100`. It immediately acquires a row-level lock on rows 1 through 100. Milliseconds later, Pod 2 executes the exact same query. Because of the `SKIP LOCKED` directive, the PostgreSQL engine instructs Pod 2 to completely bypass rows 1-100 without waiting for the lock to release. Pod 2 instead reads and instantly locks rows 101 through 200. 
The result is massive, lock-free concurrent throughput across dozens of pods without polling loops, database deadlocks, or duplicate event publishing.

### 4.3 Smart Batch Aggregation & Semantic Folding
Pushing millions of events efficiently into Kafka is entirely useless if the downstream consumers cannot process them rapidly enough. Naive consumers execute one database transaction per incoming Kafka event. At 10k RPS, executing 10,000 sequential `UPDATE` transactions crushes the database connection pool.

Taskinator introduces the **Smart Batch Aggregator**.

![img](diagrams/diagram_aggregator_folding.png)
*Figure 4.3: Smart Batch Aggregator Data Flow and Semantic Folding*

The Kafka consumer receives a massive batch of events (e.g., `batchSize: 5000`) and buffers them chronologically. It loops over the events strictly in memory. If the aggregator detects 50 "Task Created" events and 20 "Task Deleted" events pertaining to the exact same project within the batch window, it does **not** execute 70 individual SQL updates. 
Instead, it executes a Semantic Folding Algorithm to calculate a net mathematical delta (`+30`). It then executes a single, batched database update to the denormalized `project.task_count` metric. 

```typescript
// Semantic Folding Algorithm Snippet
const deltas = new Map<string, number>();

for (const event of batch) {
  if (event.type === 'TASK_CREATED') {
    deltas.set(event.projectId, (deltas.get(event.projectId) || 0) + 1);
  } else if (event.type === 'TASK_DELETED') {
    deltas.set(event.projectId, (deltas.get(event.projectId) || 0) - 1);
  }
}

// Execute folded updates
await db.transaction().execute(async (trx) => {
  for (const [projectId, delta] of deltas) {
    if (delta !== 0) {
      await trx.updateTable('project')
        .set((eb) => ({ task_count: eb('task_count', '+', delta) }))
        .where('id', '=', projectId)
        .execute();
    }
  }
});
```

By partitioning the Kafka topic strictly by `projectId`, the system guarantees that related events land on the same consumer thread, making in-memory folding highly effective and drastically reducing database write amplification.

### 4.4 Chunked Self-Signaling Deletion (The Bubbling Effect)
In hierarchical systems, deleting a root node that possesses 50,000 descendants via a synchronous SQL `ON DELETE CASCADE` command will acquire an exclusive database table lock for several seconds. 

Taskinator circumvents this by implementing **Declarative Signalling and Self-Chunking**.

![img](diagrams/diagram_chunked_deletion.png)
*Figure 4.4: Chunked Self-Signaling Deletion ("The Bubbling Effect")*

When a user deletes a large project, the API does not execute a SQL `DELETE` on the tasks. Instead, it merely emits a declarative signal: `PROJECT_DELETED` into the Outbox.
A specialized Background Listener picks up this signal and queries a very small chunk using explicit limits: `SELECT id FROM project_task WHERE fk_project_id = X LIMIT 2000`. The Listener deletes only those 2000 rows. 
If more rows remain in the project, the Listener deliberately emits a new, identical self-signal (`PROJECT_DELETED`) back into the outbox. This recursively "bubbles" through the message queue until the table is completely purged. 
By enforcing strict `LIMIT 2000` bounds on every operation, the maximum duration of a database lock never exceeds a few milliseconds, ensuring the application remains 100% available to all other users during massive cleanup operations.
