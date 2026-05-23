# Phase 3: Post-Action Cascades (Reactive) - Research

**Researched:** 2026-05-23
**Domain:** Reactive Automation / Cascading Updates
**Confidence:** HIGH

## Summary
Phase 3 focuses on implementing reactive "Post-Action Cascades" using the new `behavior_rule` engine. Unlike Phase 2 guards which are synchronous and preventive, Phase 3 cascades are asynchronous and triggered by domain events (Kafka).

**Primary recommendation:** Implement a dedicated `CascadeService` to encapsulate logic for the primary cascades (`BLOCKER_RESOLUTION`, `PRIORITY_CASCADE`, `TEAM_CASCADE`, `CASCADE_DELETE`), triggered by a refactored `AutoActionTaskEventConsumer`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Event Consumption | Background (Kafka) | — | Decouples primary mutations from side-effects. |
| Rule Evaluation | Background (Service) | — | Evaluates `behavior_rule` criteria against event data. |
| Cascading Mutations | API (Service) | — | Re-uses `TaskService` to ensure further events are emitted. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Kysely | ^0.27.0 | SQL Query Builder | Type-safe relationship traversals. |
| KafkaJS | ^2.2.4 | Event Streaming | Reliable async execution. |

## Architecture Patterns

### Cascade Execution Flow
1. `TaskService` performs a mutation and emits `TASK.UPDATED` or `TASK.DELETED` to Kafka.
2. `AutoActionTaskEventConsumer` receives the event.
3. Consumer fetches all active `behavior_rule` records for the project.
4. For each rule, `matchesCriteria` validates if the cascade should trigger.
5. If matched, the specific `CascadeService` method is called to perform the bulk update.

## Pattern 1: `matchesCriteria` Helper
**What:** Evaluates flat criteria defined in `behavior_rule`.
```typescript
function matchesCriteria(task: any, rule: any): boolean {
    if (!rule.criteria_field) return true;
    const value = task[rule.criteria_field];
    const target = rule.criteria_value;

    switch (rule.criteria_operator) {
        case 'EQUALS': return String(value) === String(target);
        case 'NOT_EQUALS': return String(value) !== String(target);
        case 'GREATER_THAN': return Number(value) > Number(target);
        case 'LESS_THAN': return Number(value) < Number(target);
        default: return true;
    }
}
```

## Cascading Queries (Kysely)

### 1. `BLOCKER_RESOLUTION`
Triggered on `TASK.UPDATED` where status transitions to `DONE`.
Checks if the parent task has any *other* incomplete blockers before transitioning.

### 2. `PRIORITY_CASCADE` / `TEAM_CASCADE`
Propagates parent attributes to all descendants using `task_reachability`.

### 3. `CASCADE_DELETE`
Deletes all descendants identified via `task_reachability` where `depth > 0`.

## Common Pitfalls

### Pitfall 1: Event Loops
**Prevention:** The `UPDATE` statements must include a `WHERE` clause ensuring the new value is different from the old value to prevent infinite Kafka trigger loops.
