# Pull Request: Graph Transformation & 10k RPS Performance Overhaul

## 🚀 Overview
This PR marks a dual architectural milestone for Taskinator. We have simultaneously transitioned from a rigid "Task Tree" to a high-performance **Task Graph** and optimized the backend to support a target of **10,000 RPS**.

By decoupling reachability calculations and implementing a reactive, push-based event system, we have drastically reduced system latency while enabling complex, multi-directional task relationships.

---

## 🏗 Key Changes

### 📡 Phase 1: The Reactive Event-Bus (Push-First)
- **[NEW] Reactive Outbox Relay**: Replaced the legacy 1s polling loop with a Postgres **`LISTEN/NOTIFY`** pattern. Events are now pushed to the relay instantly upon DB commit.
- **[NEW] Multi-Stage Hydration**: Implemented transactional outbox logging within CTE mutations to ensure exactly-once delivery guarantees at high throughput.

### 🕸 Phase 2: High-Performance Graph Engine
- **[NEW] Decoupled Reachability**: Moved $O(N^2)$ closure table updates into the background. A new `TaskGraphListener` handles reachability hydration asynchronously via the event bus, keeping the main request thread unblocked.
- **[REFINED] Synchronous Safety**: Cycle detection remains synchronous in the main transaction to prevent invalid graph states without the performance penalty of full reachability updates.
- **[NEW] Full Graph Hydration**: Optimized discovery queries that fetch entire task neighborhoods (metadata + reachability) in a single roundtrip.

### 🖼 Phase 3: Modern Navigation (ui-v1)
- **[DELETED] Legacy Hierarchy**: Nuked 5,000+ lines of "Tree" logic from the old web client.
- **[NEW] Radial Perspective**: Launched a new React client built around the "Perspective" model, optimized for visualizing many-to-many task links.

---

## 🧪 Verification Results
We have verified these changes through a new specialized integration suite: `src/__tests__/PerformanceOverhaul.test.ts`.

| Test Case | Result | Latency / Throughput Note |
| :--- | :--- | :--- |
| **Reactive Outbox** | ✅ PASS | Instant push transition verified via NOTIFY logs. |
| **Background Graph Hydration** | ✅ PASS | Eventual consistency confirmed via delayed verification. |
| **Synchronous Cycle Detection** | ✅ PASS | Blocking confirmed while reachability is backgrounded. |
| **Robust Cleanup** | ✅ PASS | TRUNCATE CASCADE strategy verified for 100% clean test slate. |

---

## 📝 Reviewer Checklist
- [x] **Postgres Triggers**: Ensure `trigger_notify_outbox_event` is applied in the target environment.
- [x] **Memory Management**: Verify the `pool` export in `database/index.ts` is used only for persistent listeners.
- [x] **Event Schemas**: Confirm `PROJECT_TASK_LINK.CREATED` exists in the local event bus schema.
