# ROADMAP — Taskinator Architecture Video

**4 phases** | **35 requirements** | All v1 requirements covered ✓
**Delivery:** One composition per phase, reviewed before the next begins.

---

### Phase 1: Smart Event Aggregation
**Goal:** Build the `SmartAggregation` Remotion composition — a deep-dive into the two-phase event aggregation pattern that solves listener fan-out, ordering problems, and concurrent side-effect races.
**Requirements:** SMART-01, SMART-02, SMART-03, SMART-04, SMART-05, SMART-06, SMART-07, SMART-08, SMART-09, SMART-10, SMART-11, SMART-12

**Success Criteria:**
1. `SmartAggregation` is registered in `Root.tsx` and renders without errors in Remotion Studio
2. All slides build and animate in correct sequence with no overlapping content
3. The two-phase pipeline (raw events → Aggregator → `*_AGGREGATED` → Listener → DB) is clearly visible as an animated diagram
4. The fan-out problem and ordering problem are shown with concrete examples before the solution is introduced
5. Idempotency via `processed_event` is explained with a visual (`claimEventsAtomic`)
6. Design system consistency: uses `Shell`, `COLORS`, `GRADIENTS`, Inter font, spring animations — indistinguishable from existing compositions

**Plans:**
- **Plan 1.1 — Fan-out Problem Slides**
  Create the problem section: title card + naive listener architecture diagram + fan-out explosion visualization + ordering problem slide
- **Plan 1.2 — Two-Phase Solution Diagram**
  Create the two-level pipeline diagram: BatchAggregator layer + Execution Listener layer + animated event flow arrows
- **Plan 1.3 — Concrete Example: Project Deletion**
  Animate a project deletion cascading through all downstream listeners — tasks, links, closure rows, team members, user counters — showing how aggregation collapses this into one signal
- **Plan 1.4 — Idempotency & Batch Mechanics**
  Slides for `claimEventsAtomic`, `FOR UPDATE SKIP LOCKED`, chronological sort within batch, at-least-once safety
- **Plan 1.5 — Wire into Root.tsx**
  Register `SmartAggregation` in `Root.tsx` with correct `durationInFrames`, verify in Remotion Studio

---

### Phase 2: Chunked Background Deletion
**Goal:** Build the `ChunkedDeletion` Remotion composition — explaining why synchronous cascade deletes fail at scale and how self-signaling chunked deletion via the Outbox pattern solves it.
**Requirements:** CHUNK-01, CHUNK-02, CHUNK-03, CHUNK-04, CHUNK-05, CHUNK-06, CHUNK-07, CHUNK-08, CHUNK-09

**Success Criteria:**
1. `ChunkedDeletion` is registered in `Root.tsx` and renders without errors
2. The table lock danger of synchronous mass delete is demonstrated with a concrete failure visualization
3. The chunk loop is animated: claim event → delete N rows → count remaining → re-publish signal → repeat
4. The Outbox guarantee for each chunk (delete rows + insert next signal = one transaction) is shown clearly
5. "No table lock beyond chunk duration" property is explicitly highlighted
6. Design system consistency maintained

**Plans:**
- **Plan 2.1 — Synchronous Delete Problem Slides**
  Title card + failure scenario animation: 10k rows, DELETE statement, table lock timer climbing, queries queued, timeout error
- **Plan 2.2 — Self-Signaling Architecture**
  Diagram of the chunk loop: event consumed → partial DELETE → row count check → conditional re-publish to Kafka → Outbox transaction boundary
- **Plan 2.3 — Chunk Transaction Detail**
  CTE diagram: `WITH deleted AS (DELETE ... LIMIT 500 RETURNING id), re_signal AS (INSERT INTO outbox_events ...)` — one atomic operation
- **Plan 2.4 — Chunk Size & Idempotency Slides**
  Tuning rationale (lock duration vs throughput), idempotency across chunks, graceful termination when count = 0
- **Plan 2.5 — Wire into Root.tsx**
  Register `ChunkedDeletion` in `Root.tsx`, verify in Remotion Studio

---

### Phase 3: Real-Time Subscriptions
**Goal:** Build the `RealtimeSSE` Remotion composition — showing the polling problem and how Kafka → Redis Pub-Sub → GraphQL WebSocket subscriptions eliminate it.
**Requirements:** RT-01, RT-02, RT-03, RT-04, RT-05, RT-06, RT-07, RT-08, RT-09

**Success Criteria:**
1. `RealtimeSSE` is registered in `Root.tsx` and renders without errors
2. The polling waste is visualized quantitatively (request counter, empty response rate)
3. The full real-time path is animated end-to-end: DB commit → Outbox → Kafka → Listener → Redis PUBLISH → Redis subscriber → WebSocket PUSH → Client
4. The multi-instance isolation problem is explained and Redis's role as the shared channel is shown
5. Before/after comparison slide clearly demonstrates zero polling with push delivery
6. Design system consistency maintained

**Plans:**
- **Plan 3.1 — Polling Problem Slides**
  Title card + polling diagram with animated request counters + "empty response" callouts + wasted bandwidth calculation
- **Plan 3.2 — Redis Pub-Sub Bridge**
  Diagram: Kafka Listener → `getRedisPublisher().publish(channel, payload)` → Redis → `getRedisSubscriber().on('message')` → PubSub engine
- **Plan 3.3 — GraphQL Subscription Path**
  Client WebSocket open → server subscription resolves → event arrives → push to client — annotated with the graphql-yoga pubsub API
- **Plan 3.4 — Multi-Instance Isolation**
  Show N API server instances, each with their own WS clients, all subscribing to the same Redis channel — messages fan out correctly
- **Plan 3.5 — Before/After Comparison + Wire into Root.tsx**
  Side-by-side: polling (many empty requests) vs subscription (zero polling, instant push) + register in `Root.tsx`

---

### Phase 4: Final Unified Architecture
**Goal:** Build the `FinalArchitecture` Remotion composition — the complete system diagram with all 7 layers visible, a traced request path, key properties summary, and closing outro.
**Requirements:** FINAL-01, FINAL-02, FINAL-03, FINAL-04, FINAL-05

**Success Criteria:**
1. `FinalArchitecture` is registered in `Root.tsx` and renders without errors
2. All architectural components are labeled and laid out clearly at 1280×720
3. An animated trace follows a single request end-to-end through all layers (highlight each layer in sequence)
4. Key properties (at-least-once delivery, O(1) reads, no polling, optimistic locking) are displayed as animated callout badges
5. The outro/closing card has a clean fade-out
6. The complete video renders in sequence from FeatureShowcase → FinalArchitecture without visual discontinuities

**Plans:**
- **Plan 4.1 — Full System Diagram Layout**
  Design and code the complete architecture diagram — all 10 nodes positioned at 1280×720, build in animated with spring + stagger
- **Plan 4.2 — Request Trace Animation**
  Animate a highlighted "pulse" traveling through: Client → API → DB (Outbox CTE) → Relay → Kafka → Aggregator → Listener → Redis → WebSocket → Client
- **Plan 4.3 — Key Properties Summary**
  Animated badge callouts: "At-Least-Once Delivery", "O(1) Reads", "No Polling", "Optimistic Locking", "10k RPS Target"
- **Plan 4.4 — Outro Card + Wire into Root.tsx**
  Closing card (project name, repo link placeholder, fade to black) + register all 4 new compositions in `Root.tsx` + full end-to-end render check
