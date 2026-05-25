# Domain Pitfalls: Project Throttling

**Domain:** Performance Engineering / Isolation
**Researched:** 2025-05-22

## Critical Pitfalls

### Pitfall 1: Throttling Cascades Blindly
**What goes wrong:** A user's `updateTask` is allowed, but the resulting reachability update is throttled. This leaves the graph in an inconsistent state (partial update).
**Why it happens:** Throttling at the consumer level without atomicity.
**Consequences:** Transitive closure becomes corrupted.
**Prevention:** 
1. The initiating action must check if there is enough "budget" for the *entire* estimated cascade.
2. If budget is insufficient, reject the *initial* action.
3. Alternatively, ensure background jobs are "eventually consistent" and can retry when budget resets.

### Pitfall 2: Redis Latency Impact
**What goes wrong:** Adding 10ms of Redis overhead to every DB write (which is already 20ms) increases P99 latency significantly.
**Why it happens:** Serial "check budget" -> "do work" -> "record usage" calls.
**Consequences:** Reduced throughput of the monolith.
**Prevention:** Use Redis Pipelines or Lua scripts to combine "check & consume" into a single roundtrip. Perform "record usage" asynchronously (fire and forget) where strict precision isn't required.

## Moderate Pitfalls

### Pitfall 1: Clock Drift
**What goes wrong:** In a distributed setup, different nodes might reset windows at slightly different times.
**Prevention:** Rely on Redis server time for TTLs and window resets.

### Pitfall 2: The "Spammer" Starving the Relay
**What goes wrong:** A project inserts 1,000,000 events. The Outbox Relay fetches them in batches of 100. It takes 10,000 batches to get through them, delaying other projects by minutes.
**Prevention:** Implement the **Fair-Share SQL** fetch pattern (Window Functions) to cap per-project impact in every batch.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Database Evolution** | Missing `fk_project_id` on internal events. | Some events are "system-wide" (e.g. `USER_DELETED`). These should be assigned a `system` project ID and have their own reserved quota. |
| **Pre-Action Guards** | GraphQL SSE/Subscriptions. | Long-lived connections (SSE) need continuous throttling, not just at the start. |
| **Hard Isolation** | Consumer Starvation. | Ensure the Reachability Engine doesn't stop entirely for one project if it's over budget, but rather slows down to a "minimum guaranteed" rate. |

## Sources
- [Shopify: Throttling Distributed Systems](https://engineering.shopify.com/blogs/engineering/throttling-distributed-systems)
- [Post-mortem: When Rate Limiters cause outages](https://www.infoq.com/articles/rate-limiters-outages/)
