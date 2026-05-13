# Taskinator — Architecture Video Script Flow
**Target audience:** YouTube technical audience (in-depth)
**Format:** Evolutionary — show naive solution → expose real problem → introduce better solution → repeat
**Last updated:** 2026-05-13

---

## Philosophy

Every phase follows the same 3-beat pattern:
1. **Show the flow** — how the system currently works, end-to-end
2. **Expose the problem** — a real failure mode, scaling wall, or race condition
3. **Introduce the solution** — a targeted architectural change that fixes it

The improved system becomes the new baseline. We raise the bar and repeat.

---

## Video Structure

### ACT 1 — What Are We Building?
> Goal: ground the viewer in the product before any tech

**Composition:** `FeatureShowcase` ✅ BUILT (810 frames = 27s)
- Core entities: Projects, Teams, Members
- The engine: Tasks with dependency links
- The graph: complex multi-level task orchestration
- Establishes what "10k RPS with consistency" needs to mean

---

### ACT 2 — The Data Foundation

**Composition:** `SchemaDesign` ✅ BUILT (3360 frames = 112s)

Sequence of sub-scenes (all embedded inside SchemaDesign):

1. **Title card** — "Schema Design"
2. **Schema entities** — ER tables build on screen:
   - `project`, `project_member`, `project_team`, `project_team_member`
   - `project_task`, `task_link`
   - FK relationships drawn as animated lines
3. **Problem: N+1 Queries** (`QueryProblem` ✅ BUILT)
   - "Every project read requires counting members, tasks, teams separately"
   - Naive: JOIN + GROUP BY on every read
4. **Solution: Denormalization** (`DenormalizationSolution` ✅ BUILT)
   - Add `members_count`, `tasks_count`, `teams_count` directly on the `project` row
   - Reads become a single SELECT — no joins, no aggregation
5. **Drawback: Write Amplification** (`DenormalizationDrawback` ✅ BUILT)
   - Every write now needs to UPDATE the counter on the parent row
   - Race condition: two concurrent inserts both read 5, both write 6 → count wrong
   - Foreshadows the need for proper concurrency control
6. **Problem: Task Graph Traversal** (`TaskLinkProblem` ✅ BUILT)
   - "Find all ancestors of a task" → recursive CTE or N queries
   - Naive parent/child: O(depth) queries, explodes at 50 levels
7. **Solution: Closure Table** (`ClosureTableSolution` ✅ BUILT)
   - `task_reachability(ancestor_id, descendant_id, depth)` — precomputed transitive closure
   - Ancestor/descendant queries become a single indexed SELECT
8. **Drawback: Closure Table Write Cost** (`ClosureTableDrawback` ✅ BUILT)
   - Adding one link writes O(ancestors × descendants) rows
   - At scale: one link addition can insert hundreds of rows synchronously
   - Foreshadows why writes need to move async

---

### ACT 3 — Architectural Evolution

**The evolutionary arc.** Each phase is introduced by a title card, then follows the 3-beat pattern.

---

#### Phase 1 — The Synchronous Baseline
**Composition:** `SyncArchitecture` ✅ BUILT (3750 frames = 125s)

- **Roadmap slide** — "Here's How This Works" — explains the Show → Problem → Solution pattern
- **Flow 1: Create Task** — Client → API → `INSERT project_task` + `UPDATE tasks_count` → 201
- **Flow 2: Create Task Link** — Client → API → `INSERT task_link` + `INSERT closure rows` → 201
- **Flow 3: Read Project** — 1 SELECT, no JOINs (denormalization working)
- **Problem A: Thread Blocking** (`BlockingSlideA`, `BlockingSlideB` ✅ BUILT)
  - Synchronous writes block the thread until DB confirms
  - Under load: threads pile up, latency spikes, requests queue
- **Async Intro** (`AsyncIntroSlide` ✅ BUILT via AsyncSolution)
  - Bridge slide: "What if the API didn't wait for side-effects?"
- **Phase 2 Preview:** Async flows for Create Task, Create Task Link, Read Project
  (`AsyncCreateTask`, `AsyncCreateTaskLink`, `AsyncReadProject` ✅ BUILT via AsyncSolution)

---

#### Phase 2 — The Dual-Write Problem
**Composition:** `AsyncProblems` ✅ BUILT (1620 frames = 54s)

- Recap: "We fire-and-forget the counter update — API returns immediately"
- **Problem: Dual-Write**
  - DB write succeeds, in-memory event publish fails (server restart, network blip)
  - Counter never updated — data permanently inconsistent
  - "Two operations, no shared transaction boundary"
- **Problem: Lost Event**
  - Even with retries: if the process dies between INSERT and publish, the event is gone
  - At-most-once delivery is not good enough for financial-accuracy counters

---

#### Phase 3 — Transactional Outbox
**Composition:** `TransactionalOutbox` ✅ BUILT (2820 frames = 94s)

- **Solution: Write to DB atomically**
  - INSERT the business entity + INSERT into `outbox_events` in the **same transaction**
  - "If the transaction commits, both rows exist. If it rolls back, neither does."
- **The Outbox Relay**
  - Background process polls `outbox_events WHERE status = 'PENDING'`
  - Uses `FOR UPDATE SKIP LOCKED` — safe for multiple relay instances
  - Dispatches to Kafka, marks rows as `PROCESSED`
- **At-least-once delivery**
  - Relay can retry safely — idempotency handled by `processed_event` table
- **Architecture diagram:** Client → API → DB (CTE: business + outbox) → Relay → Kafka → Listeners

---

#### Phase 3.5 — The Upgraded Async Flow
**Composition:** `UpgradedAsyncFlow` ✅ BUILT (930 frames = 31s)

- Side-by-side: Old naive async vs. Outbox-backed async
- Show the same 3 flows (Create Task, Create Task Link, Read) with the Outbox guarantee
- Banner: "Guaranteed delivery. Zero lost events."

---

#### Phase 4 — Concurrency & Optimistic Locking
**Composition:** `ConcurrencyControl` ✅ BUILT (1560 frames = 52s)

- **Problem: Race Condition on Counters**
  - Two requests both read `tasks_count = 5`, both write `6` → one increment lost
  - Classic lost-update problem even with the outbox pattern (events still arrive concurrently)
- **Solution: Optimistic Locking**
  - `version INTEGER` column on every entity
  - UPDATE includes `WHERE id = ? AND version = ?` — fails if version changed
  - Retry logic on conflict — safe, no deadlocks
- **Solution: Delta-based counter updates**
  - Instead of "set to 6", publish "increment by +1"
  - Aggregator consolidates multiple deltas: `+1 +1 +1 = +3` in one UPDATE

---

#### Phase 5 — Smart Event Aggregation ❌ NOT YET BUILT
**Composition:** `SmartAggregation` — **TO BUILD**

- **Problem: Listener Fan-out**
  - One project deletion triggers: delete tasks, delete links, delete closure rows, delete team members, purge memberships, update user counters...
  - If each listener fires independently, you get N concurrent writes to the same tables
  - Ordering: listener B assumes listener A ran first — race condition
- **Solution: Two-Phase Aggregation**
  - **Phase 1 — Aggregator**: Batch consumer reads raw events, computes consolidated state, publishes to `*_AGGREGATED` topic
    - `ProjectEvents_BatchAggregator`: batches CREATED/DELETED/MEMBERS_ADDED → single aggregated signal
  - **Phase 2 — Execution Listeners**: Each listener subscribes to aggregated topic only
    - `ProjectAggregated_ChangeProjectMemberCount` — updates member count
    - `ProjectAggregated_DeleteProjectTask` — cascades delete
  - **Idempotency**: `claimEventsAtomic(trx, events, consumerGroup)` — `processed_event` table
- Visual: Two-level Kafka pipeline diagram, batch window collapsing many events into one signal

---

#### Phase 6 — Chunked Background Deletion ❌ NOT YET BUILT
**Composition:** `ChunkedDeletion` — **TO BUILD**

- **Problem: Synchronous Cascade Delete**
  - Delete a project with 10,000 tasks → single transaction trying to delete all closure table rows
  - Table lock held for seconds, all reads on `task_reachability` blocked
  - Timeout risk, OOM risk
- **Solution: Chunked Self-Signaling Deletion**
  - DELETE only a chunk (e.g., 500 rows) per event
  - After each chunk: re-publish a `DELETE_CHUNK_REMAINING` event to itself if rows remain
  - Outbox pattern ensures each chunk is transactional
  - No table lock held beyond the chunk duration
- Visual: "Pac-Man" deletion — chunk by chunk, with the signal re-queuing itself

---

#### Phase 7 — Real-Time SSE ❌ NOT YET BUILT
**Composition:** `RealtimeSSE` — **TO BUILD**

- **Problem: Polling**
  - Client polls `GET /api/projects` every 2s to detect changes
  - Wasteful at scale: 1000 users × 30 requests/min = 30,000 req/min for no-change responses
- **Solution: Redis Pub-Sub Bridge + GraphQL Subscriptions**
  - Kafka listener publishes to Redis channel after processing
  - `RealtimeRedisBridge` subscribes, pushes to graphql-yoga PubSub
  - Client opens a WebSocket subscription — server pushes on change
- Visual: Event flowing from Kafka → Redis → WebSocket → Client, with "0 polling requests" counter

---

### ACT 4 — The Final Architecture
**Composition:** `FinalArchitecture` ❌ NOT YET BUILT

- Full unified diagram — all layers visible simultaneously:
  - Client → GraphQL API → Domain Services → DB (with Outbox CTE)
  - → Relay → Kafka → Aggregators → Execution Listeners
  - → Redis → GraphQL Subscriptions → Client (real-time)
- Metrics callout: "10k RPS · at-least-once delivery · O(1) reads · no polling"
- Outro

---

## Compositions Status

| # | Composition | Status | Duration | Notes |
|---|---|---|---|---|
| 1 | `FeatureShowcase` | ✅ Built | 27s | Root-registered |
| 2 | `SchemaDesign` | ✅ Built | 112s | Embeds 6 sub-scenes |
| 3 | `SyncArchitecture` | ✅ Built | 125s | Embeds BlockingProblem + AsyncSolution |
| 4 | `AsyncProblems` | ✅ Built | 54s | Dual-write problem |
| 5 | `TransactionalOutbox` | ✅ Built | 94s | Outbox + relay |
| 6 | `UpgradedAsyncFlow` | ✅ Built | 31s | Before/after comparison |
| 7 | `ConcurrencyControl` | ✅ Built | 52s | Optimistic locking + delta updates |
| 8 | `SmartAggregation` | ❌ To build | ~60s | Two-phase event aggregation |
| 9 | `ChunkedDeletion` | ❌ To build | ~50s | Chunked cascade delete |
| 10 | `RealtimeSSE` | ❌ To build | ~50s | Redis bridge + WebSocket |
| 11 | `FinalArchitecture` | ❌ To build | ~40s | Unified diagram + outro |

**Built:** 7 compositions (~8 min content)
**Remaining:** 4 compositions (~3.5 min content)
**Estimated total:** ~11.5 min

---

## Sub-files (not root-registered, embedded inside compositions)

| File | Used In | Status |
|---|---|---|
| `BlockingProblem` (`BlockingSlideA`, `BlockingSlideB`) | `SyncArchitecture` | ✅ |
| `AsyncSolution` (`AsyncIntroSlide`, `AsyncCreateTask`, `AsyncCreateTaskLink`, `AsyncReadProject`) | `SyncArchitecture` | ✅ |
| `QueryProblem` | `SchemaDesign` | ✅ |
| `DenormalizationSolution` | `SchemaDesign` | ✅ |
| `DenormalizationDrawback` | `SchemaDesign` | ✅ |
| `TaskLinkProblem` | `SchemaDesign` | ✅ |
| `ClosureTableSolution` | `SchemaDesign` | ✅ |
| `ClosureTableDrawback` | `SchemaDesign` | ✅ |
| `Composition.tsx` | (legacy/unused) | ⚠️ Check if still needed |

---

## Design System (shared across all compositions)

- **Background:** `GRADIENTS.bg` — deep navy radial
- **Glass panel:** `rgba(30,41,59,0.18)` + `backdropFilter: blur(30px)` + subtle border
- **Typography:** Inter (Google Font)
- **Colors:** `COLORS.accent` (cyan), `accent2` (purple), `accent3` (green), `warning` (amber), `danger` (red), `success` (green), `muted` (slate)
- **Animation primitives:** `spring()` with `damping: 14-16, stiffness: 80-120`
- **Node style:** dark glass card with colored border + glow
- **Arrow style:** animated SVG line with arrowhead marker + glow drop-shadow
