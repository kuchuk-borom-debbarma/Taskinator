# Domain Pitfalls

**Domain:** Event-Driven Task Automation
**Researched:** Today

## Critical Pitfalls

Mistakes that cause rewrites or major issues in Event-Driven Architectures.

### Pitfall 1: Infinite Automation Loops
**What goes wrong:** A rule is configured to "When status = Done, set priority = High". Another rule is "When priority = High, set status = Done". This causes an infinite cascade of events, bringing down the queue and DB.
**Why it happens:** Lack of provenance or cycle detection in the event payload.
**Consequences:** System crashes, degraded performance for all tenants, massive database load.
**Prevention:** Include an `actor` or `source` field in every event. If `actor == 'system'`, do not trigger rules that don't explicitly opt-in to system events.
**Detection:** Monitor queue depth. If a specific workspace spikes to 10k messages in 5 seconds, pause their rules automatically.

### Pitfall 2: Dual Write Problem
**What goes wrong:** The Task API updates the database successfully but crashes before emitting the event to the Event Bus (or vice versa). 
**Why it happens:** The DB transaction and Event Bus publish are two separate systems without distributed transactions.
**Consequences:** State inconsistency. The database shows a task is "Done", but the automation never fired.
**Prevention:** Implement the **Transactional Outbox Pattern**. Write the event to an `outbox` table in the *same* database transaction as the task mutation. A separate worker reads the outbox and publishes to the Event Bus.

## Moderate Pitfalls

### Pitfall 1: Event Schema Evolution
**What goes wrong:** You change the shape of the `task.updated` event, and older workers crash because they expect the old schema.
**Prevention:** Strictly version your event schemas (e.g., `task.updated.v1`). Never remove fields; only add.

## Minor Pitfalls

### Pitfall 1: Missing "Before" State
**What goes wrong:** The event only contains the new state. A rule wants to know if a task moved *from* "Todo" *to* "Done", but it can't.
**Prevention:** Always include `{ changes: { old: X, new: Y } }` in the event payload for mutations.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Event Foundation | Dual write inconsistencies | Use the Outbox Pattern immediately. |
| ECA Engine | Evaluating rules sequentially is slow | Load rules into memory or evaluate concurrently. |