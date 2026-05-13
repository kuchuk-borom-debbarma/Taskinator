---
title: ARCHITECTURE
last_mapped: 2026-05-13
---

# Architecture

## System Overview

Taskinator-v2 is a **task orchestration engine** built as a **modular monolith** with an event-driven core. The codebase contains:

1. **`modular-monolith/`** — TypeScript/Bun backend (GraphQL API + event-driven domain logic)
2. **`ui-v1/`** — React/Vite frontend (task graph visualization, project management)
3. **`remotion/`** — Video rendering for demos
4. **`thesis/`** — Academic documentation builder

---

## Backend Architecture

### Pattern: Modular Monolith + Transactional Outbox + Event-Driven Aggregation

```
Mutation → Domain Service → Kysely (PostgreSQL)
                 |
         outbox_events (CTE)
                 |
         OutboxRelay (LISTEN/NOTIFY polls)
                 |
         KafkaBus (Redpanda)
                 |
    Smart Aggregator Consumers
    (BatchAggregator per domain)
                 |  *_AGGREGATED topics
    Execution Listeners (side-effects)
                 |
         Redis Pub-Sub (RealtimeRedisBridge)
                 |
    GraphQL Subscriptions (graphql-yoga)
```

### Key Architectural Decisions

#### 1. Transactional Outbox Pattern
- Every domain mutation writes to `outbox_events` in the **same database transaction** as the business entity (via CTE: `WITH inserted_project AS (...), inserted_outbox AS (...)`)
- `OutboxRelay` (`src/utils/event-bus/OutboxRelay.ts`) polls `outbox_events` using `FOR UPDATE SKIP LOCKED` (concurrent-safe) and dispatches to the bus
- Guarantees at-least-once delivery without distributed transactions

#### 2. Two-Phase Event Processing (Smart Aggregation)
- **Phase 1 — Aggregators**: Batch consumers (e.g., `ProjectEvents_BatchAggregator`) read raw domain events, compute deltas, and publish to `*_AGGREGATED` topics. They do NOT touch application tables directly.
- **Phase 2 — Execution Listeners**: Listen to aggregated topics, perform idempotent side-effects (e.g., `ProjectAggregated_ChangeProjectMemberCount` updates `members_count`).
- **Benefit**: Deduplication, batching, and strict ordering at the aggregation phase; independent execution at the listener phase.

#### 3. Explicit Idempotency via `processed_event`
```sql
processed_event (event_id UUID, consumer_group TEXT, PRIMARY KEY (event_id, consumer_group))
```
- Every listener calls `claimEventsAtomic(trx, events, consumerGroup)` within a transaction
- Only unprocessed events are handled; duplicates are silently skipped

#### 4. Task Graph — Adjacency List + Reachability Index
- **`task_link`** — direct edges (source → target with a `label`)
- **`task_reachability`** — transitive closure (ancestor → descendant with `depth`)
- Self-referential constraint: `chk_task_link_not_self` prevents cycles at edge creation
- Unique constraint on `(source_task_id, target_task_id)` prevents duplicate edges

#### 5. Denormalized Counters for Performance
Each aggregate stores denormalized counts updated via Execution Listeners:
- `project.members_count`, `project.tasks_count`, `project.teams_count`
- `project_team.members_count`, `project_team.tasks_count`
- `project_task.direct_incoming_count`, `direct_outgoing_count`, `total_incoming_count`, `total_outgoing_count`, `incoming_label_counts (JSONB)`, `outgoing_label_counts (JSONB)`

#### 6. Optimistic Locking
- All domain entities have a `version INTEGER` column
- Concurrent mutations check `WHERE version = $param.version` → prevents lost updates

#### 7. DataLoader Pattern (N+1 Prevention)
- All GraphQL resolvers use DataLoaders from `src/graphql/dls/`
- Per-request loaders created in `src/graphql/context.ts`
- Loaders: `user.byId`, `project.byId`, `projectMember.byId`, `task.byId`, `team.byId`

---

## Frontend Architecture

### Pattern: Adapter + Interface Segregation + Lazy Loading

```
Router (TanStack Router)
    |
    Route -> Lazy Component (React.lazy + *.lazy.tsx wrapper)
            |
            Component -> useApi() hook -> API Interface
                                |
                         API Adapter (GraphQLProjectAPI, etc.)
                                |
                         graphql-codegen types -> Raw GraphQL fetch
```

### Key Frontend Decisions

#### 1. API Interface Segregation
- `src/api/interfaces/` — abstract interfaces (`ProjectAPI`, `TaskAPI`, `TeamAPI`)
- `src/api/adapters/graphql/` — concrete GraphQL implementations
- `src/context/ApiContext.tsx` — provides adapter instances via React context
- Swappable without component changes

#### 2. Task Graph Visualization
- **ReactFlow** (`@xyflow/react`) for rendering nodes/edges
- **D3-force** for layout algorithm
- **Web Worker** (`layoutWorker.ts`) runs force simulation off main thread to avoid UI blocking
- Custom `TaskNode` and `TaskGraph` components in `src/components/Graph/`

#### 3. Route-Level Code Splitting
- Each view has a `*.lazy.tsx` wrapper at `src/` root
- Heavy components (graph, task detail) only loaded when navigated to

#### 4. GraphQL Type Safety
- `graphql-codegen` generates fully typed query/mutation/subscription hooks
- Generated `src/gql/graphql.ts` is the single source of truth for API types
- Fragment masking via `fragment-masking.ts`

---

## Data Flow: Task Creation

```
1. UI sends createTask GraphQL mutation
2. GraphQL resolver (src/graphql/resolvers/task.ts)
3. TaskService.createTask() -> TaskQueries.insertTask()
4. CTE: INSERT INTO project_task + INSERT INTO outbox_events (atomic)
5. OutboxRelay picks up TASK.CREATED event -> publishes to Kafka TASK topic
6. TaskEvents_BatchAggregator consumes -> publishes TASK_AGGREGATED events
7. Execution listeners update project.tasks_count, team.tasks_count, task_reachability
8. Redis bridge publishes update -> GraphQL subscription notifies subscribed clients
```

---

## Module Boundaries

Each domain module under `src/modules/` exposes only a typed service interface:
- `ProjectService.ts` — public interface
- `index.ts` — singleton export (`projectService`)
- `internal/` — implementation details (hidden from other modules)
  - `ProjectServiceImpl.ts`
  - `ProjectQueries.ts`
  - `listeners/` — event handlers specific to this domain

Cross-module communication happens **only through the event bus**, never via direct imports between `internal/` directories.
