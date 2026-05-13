---
plan: 1.4
title: Idempotency & Batch Mechanics
phase: 1
wave: 2
depends_on: [1.2]
files_modified:
  - remotion/src/SmartAggregationMechanics.tsx
autonomous: true
requirements:
  - SMART-09
  - SMART-11
  - SMART-12
---

# Plan 1.4 — Idempotency & Batch Mechanics

## Goal

Create `SmartAggregationMechanics.tsx` — two deep-dive slides explaining the internals of how the aggregator safely claims events and how idempotency is guaranteed:

1. **SkipLockedSlide** — `FOR UPDATE SKIP LOCKED` — safe concurrent claiming of outbox events
2. **IdempotencySlide** — `processed_event` table + `claimEventsAtomic()` guarantees at-least-once with no duplicates

## Context

<read_first>
- `remotion/src/TransactionalOutbox.tsx` — reference for code snippet card pattern and step-by-step reveal
- `modular-monolith/src/utils/event-bus/idempotency.ts` — real `claimEventsAtomic` implementation (read to get the exact SQL and logic)
- `modular-monolith/src/utils/event-bus/OutboxQueries.ts` — `FOR UPDATE SKIP LOCKED` usage
- `modular-monolith/src/database/tables/ProcessedEvent.ts` — `processed_event` table schema
- `remotion/src/components/Nodes.tsx` — COLORS, GRADIENTS
</read_first>

## Tasks

### Task 1 — SkipLockedSlide

<action>
Create `SkipLockedSlide` — explains how multiple BatchAggregator instances can safely run in parallel without claiming the same events.

Layout (glass panel):

Header: chip "SAFE CONCURRENT CLAIMING" `COLORS.accent`
Title: "FOR UPDATE SKIP LOCKED" fontSize:32 fontWeight:900
Sub: "Multiple aggregator instances, zero duplicate processing"

Left half (x: 30–580): Timeline of 3 aggregator instances trying to claim the same batch row

- Instance A node top:180, left:30, w:160, `COLORS.accent`, delay:10 — "🔒 Acquires lock"
- Instance B node top:300, left:30, w:160, `COLORS.warning`, delay:18 — "⏩ Skips locked"
- Instance C node top:420, left:30, w:160, `COLORS.muted`, delay:26 — "⏩ Skips locked"

Arrow from Instance A → outbox_events row icon at top:290, left:280 (lock icon 🔒, delay:14)
Badge at delay:22: "B and C skip this row — claim next available" near top:350, left:200, `COLORS.warning`

Right half (x: 620–1240): SQL code card at top:140, left:620, w:600:
```sql
SELECT id, kafka_topic, payload
FROM outbox_events
WHERE status = 'PENDING'
ORDER BY created_at ASC
LIMIT 100
FOR UPDATE SKIP LOCKED;
```
Dark glass card, border `COLORS.accent`, monospace font, fontSize:13.

At delay:50: green callout below SQL: "Safe for N parallel relay instances"

Use `Appear` helper with x=20 for right-side elements (slide in from right).
</action>

<acceptance_criteria>
- Three aggregator instances visible with distinct states
- SQL block is legible with correct syntax highlighted (monospace, colored border)
- "SKIP LOCKED" is visually emphasized
- No TypeScript errors
</acceptance_criteria>

---

### Task 2 — IdempotencySlide

<action>
Create `IdempotencySlide` — explains `processed_event` table and `claimEventsAtomic()`.

Layout (glass panel):

Header chip: "IDEMPOTENCY GUARANTEE" `COLORS.success`
Title: "claimEventsAtomic()" fontSize:30 fontWeight:900
Sub: "No event processed twice — even with retries and crashes"

Step-by-step reveal (use `DbStep`-style numbered cards stacked vertically on left, starting top:140):

Step 1 (delay:10): "Open transaction" — sub: "BEGIN"
Step 2 (delay:20): "Lock claimed events" — sub: "SELECT ... FOR UPDATE SKIP LOCKED"
Step 3 (delay:32): "Filter already-processed" — sub: "WHERE id NOT IN (SELECT event_id FROM processed_event WHERE consumer_group = ?)"
Step 4 (delay:44): "Process unprocessed events" — sub: "Run listener business logic"
Step 5 (delay:56): "Insert into processed_event" — sub: "INSERT INTO processed_event (event_id, consumer_group) ON CONFLICT DO NOTHING"
Step 6 (delay:68): "COMMIT" — sub: "Atomic: either all steps succeed or none do"

Right panel (x:720, top:120, w:480):
- `processed_event` table schema card:
  - columns: `id PK`, `event_id FK→outbox_events`, `consumer_group TEXT`, `processed_at TIMESTAMPTZ`
  - border: `COLORS.accent3`
  - appears at delay:15

At delay:85: green banner bottom-center: "At-least-once delivery · No duplicates · Crash-safe"

Use `DbStep` component pattern from `SyncArchitecture.tsx` (numbered circle + border-left card).
</action>

<acceptance_criteria>
- 6 steps appear in order with staggered timing
- `processed_event` schema card visible on right side
- Steps show actual SQL/logic (not vague descriptions)
- Final banner appears after all steps
- No TypeScript errors
</acceptance_criteria>

---

## Verification

<must_haves>
- [ ] `SmartAggregationMechanics.tsx` exists in `remotion/src/`
- [ ] Exports: `SkipLockedSlide`, `IdempotencySlide`
- [ ] SQL in `SkipLockedSlide` matches the actual `FOR UPDATE SKIP LOCKED` pattern from `OutboxQueries.ts`
- [ ] `claimEventsAtomic` steps in `IdempotencySlide` match the actual implementation in `idempotency.ts`
- [ ] `tsc --noEmit` passes
</must_haves>
