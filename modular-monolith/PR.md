# Pull Request: Task Reachability Engine Refactor & Ordered EDA Flow

## Summary
This PR implements a high-performance **Closure Table** reachability engine and hardens the **Event-Driven Architecture (EDA)** to guarantee causal ordering and transactional consistency across modules.

## Key Changes

### 1. Hardened Event Orchestration
- **Monotonic Sequencing**: Migrated `outbox_events.id` to `BIGSERIAL`. This ensures that the outbox relay preserves the exact commit order when publishing to Kafka.
- **Causal Sorting**: Implemented chronological sorting (by `timestamp`) in all Smart Aggregators (`Task`, `Project`, `Team`) to ensure that `Create -> Update -> Delete` causal chains are preserved regardless of Kafka fetch order.
- **Action-Oriented Signaling**: Refactored the Task Aggregator to emit declarative commands (`SYNC`, `DELETE`, `ORPHAN`) instead of raw state events, reducing downstream churn and coupling.

### 2. Task Reachability Engine (Closure Table)
- **$O(1)$ Lookups**: Transitioned from a path-counting model to a Closure Table pattern for near-instant transitive reachability checks.
- **Expansion (Bridge Join)**: Implemented high-performance sub-graph expansion logic using a single-query bridge cross-join.
- **Contraction (Recursive Repair)**: Implemented a "Delete-and-Repair" strategy using Recursive CTEs to handle link removals. This accurately preserves alternative paths (solving the "Diamond" problem) without the overhead of path counts.
- **Bulk Cleanup**: Added dedicated listeners to purge transitive data when tasks or entire projects are deleted.

### 3. Data Consistency & Performance
- **Atomic Idempotency**: All new listeners use the `claimEventsAtomic` strategy to prevent duplicate processing.
- **Denormalized Sync**: Integrated project-wide counter synchronization (`total_incoming_count`, `total_outgoing_count`) into the reachability lifecycle.
- **Schema Alignment**: Fixed multiple column and table name inconsistencies in `TaskQueries.ts` to match the production schema.

## Impact
- **Zero Zombie Nodes**: Causal sorting prevents orphaned links and inconsistent graph states.
- **Scalability**: Optimized for **10k RPS** through semantic folding in aggregators and efficient batch processing in listeners.
- **Reliability**: Transactional outbox pattern ensures eventual consistency even in the event of system failure.

## Verification Plan
- [x] Verified Bridge Join logic for transitive expansion.
- [x] Verified Recursive CTE for path repair during link removal.
- [x] Verified Bulk Deletion listeners for project/task cleanup.
- [x] Confirmed monotonic outbox sequencing via schema migration.

## Related Documentation
- [docs/5. Task Reachability Engine.md](docs/5. Task Reachability Engine.md)
- [docs/6. Event-Driven Architecture & Reachability.md](docs/6. Event-Driven Architecture & Reachability.md)
