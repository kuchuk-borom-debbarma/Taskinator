# Architecture Patterns: Project-Level Throttling

**Domain:** Multi-tenant Resource Management
**Researched:** 2024-05-24

## Recommended Architecture

The architecture follows a "Guardrail" pattern where resource consumption is intercepted at every layer using a Project Identity Context.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `ThrottlingMiddleware` | Intercepts HTTP requests, checks Redis for credits. | Redis, Auth Service |
| `ThrottledTransaction` | Wraps DB transactions, injects `SET LOCAL` limits. | Postgres |
| `FairShareRelay` | Fetches events from Outbox using fair-share logic. | Postgres, Kafka |
| `TaskScheduler` (Bottleneck) | Manages concurrency for background graph updates. | Redis |

### Data Flow

1. **Request Entry:** Middleware extracts `project_id`.
2. **Node.js Check:** `rate-limiter-flexible` checks Redis. If over limit, return 429.
3. **Task Queue:** If async, `Bottleneck` queues the task under the `project_id` key.
4. **Database Execution:** Before executing SQL, the transaction wrapper runs `SET LOCAL statement_timeout = X`.
5. **Event Emission:** Outbox Relay fetches $N$ events per project using a window function to ensure fairness.

## Patterns to Follow

### Pattern 1: Fair-Share Outbox Fetching
**What:** Use SQL Window Functions to ensure no single project dominates a fetch batch.
**When:** Every Outbox Relay cycle.
**Example:**
```sql
SELECT * FROM (
  SELECT *, 
  ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id ASC) as project_rank
  FROM outbox_events
  WHERE status = 'PENDING'
) ranked_events
WHERE project_rank <= 10 -- Max 10 per project
LIMIT 100; -- Global batch size
```

### Pattern 2: Identity Propagation
**What:** Pass `project_id` through the entire call stack (AsyncLocalStorage or explicit params).
**Why:** To ensure the DB and Kafka layers know which project to charge/throttle.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Resource Leakage
**What:** Setting a timeout that persists across multiple requests.
**Why bad:** If using connection pooling, a `SET statement_timeout` might affect the *next* user of that connection.
**Instead:** Always use `SET LOCAL` inside a transaction block, or manually reset the timeout in a `finally` block.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Redis Load | Negligible | Moderate (needs cluster) | High (requires sharding by project_id) |
| Postgres Roles | Manageable | Impossible (too many roles) | Impossible |
| Outbox Table | Fast | Slow (needs index on project_id + status) | Needs partitioning by date/project |

## Sources

- [Node.js AsyncLocalStorage for Context Propagation](https://nodejs.org/api/async_context.html)
- [PostgreSQL Window Functions for Pagination/Sampling](https://www.postgresql.org/docs/current/tutorial-window.html)
