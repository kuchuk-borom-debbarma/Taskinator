# Phase 25: Pipeline Orchestrator - Research

**Researched:** 2025-05-20
**Domain:** Event-Driven Orchestration / Resumable Pipelines
**Confidence:** HIGH

## Summary
The Pipeline Orchestrator implements a resumable, event-driven loop for executing Autopilot sequences. By treating each step (Condition or Action) as a discrete unit of work followed by an event emission, we ensure system stability and 10k RPS compatibility. (RESOLVED)

**Primary recommendation:** Use a "Recursive Kafka Loop" where the Orchestrator emits a `PIPELINE.CONTINUE` event to the Outbox after each successful step to checkpoint state and prevent long-running transactions.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- ID-based referencing in `autopilot.steps`.
- Resumable execution (one step at a time, emitting events to continue).
- Smart Aggregation & Bulk Operations for actions.
- Strict Halt (failing condition stops pipeline).
- TraceID + Depth Counter (max 50) for loop detection.
- Moving Window State Sync (using ContextBuilder).

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `kafkajs` | 2.2.4 | Event streaming | Project standard for Logic Lane |
| `kysely` | 0.28.14 | SQL Query Builder | Type-safe atomic updates |
| `uuid` | 14.0.0 | TraceID generation | Distributed tracing |
| `ioredis` | 5.10.1 | Distributed Locking | Prevents race conditions in step execution |

## Architecture Patterns

### Resumable Loop (Event-Driven)
The orchestrator consumes a `PIPELINE.TRIGGER` or `PIPELINE.CONTINUE` event. (RESOLVED)
1. **Fetch State**: Load `stepIndex`, `traceId`, `depth`, and `wasSnapshot` from event payload.
2. **Execute Step**:
   - If **Condition**: Evaluate via `ConditionEvaluator`. If false, **HALT**.
   - If **Action**: Execute via `ActionExecutor`. Collect modified `ContextualEntity` objects.
3. **Persist & Emit**:
   - Save changes in a single transaction.
   - If `stepIndex < totalSteps`, emit `PIPELINE.CONTINUE` with `stepIndex + 1`.
   - Update `wasSnapshot` for the next step.

### Smart Aggregator Buffer (RESOLVED)
Group actions by `entityType:entityId` to enable bulk SQL updates:
```typescript
interface AggregationBuffer {
  [targetKey: string]: {
    type: string;
    id: string;
    changes: Record<string, any>;
    traceIds: string[];
  };
}
```

## Common Pitfalls

- **Stale Context**: Fetching the "is" state too early. **Solution:** Use `ContextBuilder.fetchIsState` inside the step-processing loop.
- **Zombie Consumers**: Kafka heartbeats failing during long batch processing. **Solution:** Use `heartbeat()` call inside `eachBatch` loop.
- **Infinite Cascades**: Depth counter must be incremented and checked at every recursive trigger (new trace), not every step.

## Open Questions (RESOLVED)
- **Snapshot Storage**: For extremely large entity states, `wasSnapshot` stays in Kafka payload for now as most entities are small records.
- **Aggregator Timeout**: Flush interval set to 100ms for balance between latency and throughput.
