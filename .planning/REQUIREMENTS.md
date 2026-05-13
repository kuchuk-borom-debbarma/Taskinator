# Requirements — Taskinator Architecture Video

## v1 Requirements

### Smart Event Aggregation (Phase 1)

- [ ] **SMART-01**: Viewer can see a title card introducing "Phase 5 — Smart Event Aggregation"
- [ ] **SMART-02**: Viewer understands the fan-out problem — one domain event triggering many independent listener side-effects
- [ ] **SMART-03**: Viewer understands the ordering problem — listener B assumes listener A finished first
- [ ] **SMART-04**: Viewer understands the naive listener architecture (each event type → one listener → one DB write)
- [ ] **SMART-05**: Viewer can see the Two-Phase Aggregation solution introduced clearly with a diagram
- [ ] **SMART-06**: Viewer understands the Aggregator role — batch consumer that reads raw events, computes consolidated state, publishes to `*_AGGREGATED` topic
- [ ] **SMART-07**: Viewer understands the Execution Listener role — subscribes to aggregated topic only, performs one targeted DB write
- [ ] **SMART-08**: Viewer can see animated flow: raw event → BatchAggregator → `*_AGGREGATED` → Listener → DB
- [ ] **SMART-09**: Viewer understands idempotency via `processed_event` — `claimEventsAtomic(trx, events, consumerGroup)`
- [ ] **SMART-10**: Viewer sees a concrete example (project deletion fan-out: tasks, links, closure rows, team members, user counters)
- [ ] **SMART-11**: Viewer understands chronological sort within a batch — why event ordering inside a batch matters
- [ ] **SMART-12**: Viewer sees the `FOR UPDATE SKIP LOCKED` pattern used by the aggregator to claim events safely

### Chunked Background Deletion (Phase 2)

- [ ] **CHUNK-01**: Viewer can see a title card introducing "Phase 6 — Chunked Background Deletion"
- [ ] **CHUNK-02**: Viewer understands why deleting a large project synchronously is dangerous (table lock, transaction size, timeout)
- [ ] **CHUNK-03**: Viewer can see a concrete failure scenario — 10,000 task closure rows, one DELETE, seconds of table lock
- [ ] **CHUNK-04**: Viewer understands the self-signaling architecture — delete a chunk, re-publish event to self if more rows remain
- [ ] **CHUNK-05**: Viewer can see the chunk loop animated — each iteration: claim event → delete N rows → check remaining → re-publish or stop
- [ ] **CHUNK-06**: Viewer understands how the Outbox pattern makes each chunk transactional (delete rows + insert next signal = atomic)
- [ ] **CHUNK-07**: Viewer can see the "no table lock beyond chunk duration" property explained
- [ ] **CHUNK-08**: Viewer understands chunk size tuning (why 500 rows vs 50 vs 5000)
- [ ] **CHUNK-09**: Viewer can see idempotency preserved across chunks

### Real-Time SSE / Subscriptions (Phase 3)

- [ ] **RT-01**: Viewer can see a title card introducing "Phase 7 — Real-Time"
- [ ] **RT-02**: Viewer understands the polling problem — N clients × M requests/min with mostly empty responses
- [ ] **RT-03**: Viewer can see the polling waste visualized (request counter, empty responses highlighted)
- [ ] **RT-04**: Viewer understands the Redis Pub-Sub bridge — Kafka event → Listener → Redis PUBLISH → Redis subscriber
- [ ] **RT-05**: Viewer understands GraphQL subscriptions — client opens WebSocket, server PUSHes on change
- [ ] **RT-06**: Viewer can see the full real-time path animated: DB change → Outbox → Kafka → Listener → Redis → WebSocket → Client
- [ ] **RT-07**: Viewer understands the instance isolation problem — multiple API server instances, each with different WS clients
- [ ] **RT-08**: Viewer understands how Redis solves instance isolation — all instances subscribe to the same channel
- [ ] **RT-09**: Viewer sees before/after: polling (many wasted requests) vs subscription (zero polling, push on change)

### Final Unified Architecture (Phase 4)

- [ ] **FINAL-01**: Viewer can see the complete system diagram with all layers active simultaneously
- [ ] **FINAL-02**: All architectural components labeled: Client, GraphQL API, Domain Services, PostgreSQL, Outbox Relay, Kafka (Redpanda), Aggregators, Execution Listeners, Redis, WebSocket
- [ ] **FINAL-03**: A sample request path is traced end-to-end through all layers with animated highlights
- [ ] **FINAL-04**: Viewer sees the key properties summarized: at-least-once delivery, O(1) reads, no polling, optimistic locking
- [ ] **FINAL-05**: Viewer sees an outro / closing card

---

## v2 Requirements (deferred)

- Voiceover audio narration
- Caption/subtitle tracks
- Auth / Identity service walkthrough (separate video)
- Performance benchmark numbers overlaid
- Playlist sequencing / chapter markers

---

## Out of Scope

- Audio production — visual-only for v1
- Auth/identity architecture — belongs in a separate video
- Frontend code walkthrough (React/TanStack) — different concern
- Deployment/infrastructure (Docker, CI) — different concern
- Adding new backend features to Taskinator — this video documents existing architecture

---

## Traceability

| REQ-ID | Phase |
|---|---|
| SMART-01 → SMART-12 | Phase 1 — Smart Aggregation |
| CHUNK-01 → CHUNK-09 | Phase 2 — Chunked Deletion |
| RT-01 → RT-09 | Phase 3 — Real-Time SSE |
| FINAL-01 → FINAL-05 | Phase 4 — Final Architecture |
