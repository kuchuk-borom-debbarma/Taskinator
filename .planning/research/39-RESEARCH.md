# Phase 39: Smart Aggregator Isolation - Research

**Researched:** 2024-05-20
**Domain:** Kafka / Event-Driven Architecture / Database Isolation
**Confidence:** HIGH

## Summary

This phase focuses on decoupling the "Smart Aggregators" (which fold high-frequency events into batch signals) and their "Aggregated Listeners" (which perform bulk database updates) from direct database access. Currently, these components instantiate transactions and perform raw SQL queries directly using the `db` instance. 

The primary recommendation is to introduce a service-oriented layer that encapsulates idempotency checks, transactional outbox writes, and bulk domain updates. This follows the project's move towards a modular monolith where infrastructure concerns (like Kafka and raw SQL) are hidden behind service interfaces.

**Primary recommendation:** Introduce `AggregatorService` to handle the generic "claim-process-outbox" pattern for aggregators, and extend `AuthService`, `ProjectService`, `TeamService`, and `TaskService` with internal batch-processing methods to handle aggregated signals.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Event Folding | Kafka Consumer | — | Aggregators hold state in-memory during batch processing to "fold" events (e.g., +1 then -1 = 0). |
| Idempotency | Service Layer | Database | Services must ensure each Kafka event is only processed once using the `processed_event` table. |
| Outbox Sink | Service Layer | — | Aggregators must write folded signals to the `outbox_events` table within a transaction. |
| Bulk DB Updates | Module Service | Database | The actual denormalized counter updates and decommissioning logic belong in the domain's Service. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Kysely | 0.27.3 | Type-safe SQL builder | Standard for the modular-monolith. |
| KafkaJS | [VERIFIED: npm registry] | Event Streaming | Primary message broker interface. |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| kysely | npm | 3 yrs | 350k/wk | github.com/kysely-org/kysely | [OK] | Approved |
| kafkajs | npm | 6 yrs | 600k/wk | github.com/tulios/kafkajs | [OK] | Approved |

## Architecture Patterns

### Recommended Project Structure
```
modular-monolith/src/
├── kafka/
│   └── smart-aggregator-consumer/   # Aggregators (Logic only, no direct DB)
├── modules/
│   ├── auth/
│   │   ├── AuthService.ts           # Extended with handleUserProjectCountSync
│   │   └── internal/
│   │       └── listeners/           # Call AuthService instead of Queries
│   └── project/ ...
└── utils/
    └── event-bus/
        └── AggregatorService.ts     # NEW: Orchestrates the atomic aggregator flow
```

### Proposed `AggregatorService` Pattern
```typescript
/**
 * Generic service to encapsulate the Smart Aggregator lifecycle.
 */
export class AggregatorService {
    async processAggregatorBatch(
        groupId: string,
        events: DomainEvent[],
        folder: (unprocessed: DomainEvent[]) => OutboxEntry[]
    ): Promise<void> {
        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(trx, events, groupId);
            if (unprocessed.length === 0) return;
            
            const entries = folder(unprocessed);
            if (entries.length > 0) {
                await appendEventsToOutbox(trx, entries);
            }
        });
    }
}
```

## Domain Tables and modified by Aggregators

Aggregators do not modify domain tables directly; they write signals to the `outbox_events` table. The downstream **Listeners** perform the following modifications:

| Module | Table | Modified Column(s) / Action | Affected by Aggregator |
|--------|-------|-----------------------------|-----------------------|
| **Auth** | `users` | `projects_count` (Incremental) | Project |
| **Project** | `project` | `members_count`, `tasks_count`, `teams_count` (Incremental) | Project, Task, Team |
| **Project** | `project_member` | Row Deletion | Project |
| **Team** | `project_team` | `members_count`, `tasks_count` (Incremental), Row Deletion | Project, Task, Team |
| **Team** | `project_team_member`| Row Deletion | Project, Team |
| **Task** | `tasks` | `fk_team_id` (NULLify), `fk_user_id` (NULLify), Row Deletion | Project, Team |
| **Task** | `task_links` | Row Deletion | Project, Task |
| **Task** | `task_reachability` | Row Deletion, Transitive Closure Expansion/Contraction | Project, Task |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotency | Custom `if (seen) return` | `claimEventsAtomic` | Requires DB-level atomic insert (ON CONFLICT DO NOTHING) to handle race conditions in multi-pod deployments. |
| Transactional Outbox | Custom background polling | `appendEventsToOutbox` | Consistency between domain updates and event emission is guaranteed by DB transactions. |

## Common Pitfalls

### Pitfall 1: Missing Idempotency in Listeners
**What goes wrong:** Some listeners (e.g., `TaskAggregated_ReachabilitySyncListener`) currently loop through events and execute updates without calling `claimEventsAtomic`.
**How to avoid:** Every listener consuming from a Kafka topic MUST use a unique `groupId` and claim events before processing.

### Pitfall 2: Double-Folding
**What goes wrong:** Aggregators fold events, then Listeners consolidate them again.
**Why it happens:** Kafka batching. Multiple folded events (signals) for the same entity might arrive in a single Kafka consumer batch.
**How to avoid:** Services should accept a list of events/deltas and perform a final consolidation before executing the bulk SQL update.

## Proposed Service Interface Methods

### AuthService
```typescript
handleUserProjectCountSync(events: DomainEvent<{ userId: string; delta: number }>[]): Promise<void>;
```

### ProjectService
```typescript
handleProjectMemberCountSync(events: DomainEvent<{ projectId: string; delta: number }>[]): Promise<void>;
handleRemoveProjectMember(events: DomainEvent<{ projectId: string; userIds: string[] }>[]): Promise<void>;
handleDeleteProjectMember(events: DomainEvent<{ projectIds: string[] }>[]): Promise<void>;
handleSyncProjectTaskCount(events: DomainEvent<{ projectId: string; delta: number }>[]): Promise<void>;
handleSyncProjectTeamCount(events: DomainEvent<{ projectId: string; delta: number }>[]): Promise<void>;
```

### TeamService
```typescript
handleSyncTeamMemberCount(events: DomainEvent<{ teamId: string; delta: number }>[]): Promise<void>;
handleRemoveProjectTeamMember(events: DomainEvent<{ projectId: string; userIds: string[] }>[]): Promise<void>;
handleDeleteProjectTeamMember(events: DomainEvent<{ projectIds: string[] }>[]): Promise<void>;
handleDeleteProjectTeam(events: DomainEvent<{ projectIds: string[] }>[]): Promise<void>;
handlePurgeTeamMemberships(events: DomainEvent<{ teamIds: string[] }>[]): Promise<void>;
```

### TaskService
```typescript
handleUnassignProjectTaskMember(events: DomainEvent<{ projectId: string; userIds: string[] }>[]): Promise<void>;
handleDeleteProjectTask(events: DomainEvent<{ projectIds: string[] }>[]): Promise<void>;
handleDeleteProjectTaskLink(events: DomainEvent<{ projectIds: string[] }>[]): Promise<void>;
handleDeleteProjectReachability(events: DomainEvent<{ projectIds: string[] }>[]): Promise<void>;
handleSyncTeamTaskCount(events: DomainEvent<{ teamId: string; delta: number }>[]): Promise<void>;
handleUnassignMemberFromTeamTasks(events: DomainEvent<{ teamId: string; userIds: string[] }>[]): Promise<void>;
handleOrphanTeamTasks(events: DomainEvent<{ teamIds: string[] }>[]): Promise<void>;
handleTaskReachabilitySync(events: DomainEvent<{ projectId: string; links: any[] }>[]): Promise<void>;
handleDeleteTaskLinks(events: DomainEvent<{ taskIds: string[] }>[]): Promise<void>;
handleDeleteTaskReachability(events: DomainEvent<{ taskIds: string[] }>[]): Promise<void>;
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Data layer | ✓ | 15+ | — |
| Kafka | Event Bus | ✓ | — | — |

## Sources

### Primary (HIGH confidence)
- `modular-monolith/src/kafka/smart-aggregator-consumer/` - Aggregator logic
- `modular-monolith/src/modules/*/internal/listeners/` - Aggregated Listener logic
- `modular-monolith/src/utils/event-bus/idempotency.ts` - Idempotency implementation
- `modular-monolith/src/utils/event-bus/OutboxQueries.ts` - Outbox implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Core project technology.
- Architecture: HIGH - Follows established patterns in the codebase.
- Pitfalls: MEDIUM - Based on manual audit of existing listeners.

**Research date:** 2024-05-20
**Valid until:** 2024-06-20
