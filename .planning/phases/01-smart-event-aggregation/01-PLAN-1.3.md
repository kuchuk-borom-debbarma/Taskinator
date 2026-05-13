---
plan: 1.3
title: Project Deletion Cascade Example
phase: 1
wave: 2
depends_on: [1.1]
files_modified:
  - remotion/src/SmartAggregationExample.tsx
autonomous: true
requirements:
  - SMART-10
  - SMART-12
---

# Plan 1.3 — Project Deletion Cascade Example

## Goal

Create `SmartAggregationExample.tsx` — a concrete end-to-end walkthrough showing how a `PROJECT_DELETED` event flows through the two-phase aggregation system. Two exported slides:

1. **NaiveExplosionSlide** — the naive version: project deletion fires 5 independent writes simultaneously, race conditions visible
2. **AggregatedDeletionSlide** — the aggregated version: the same deletion produces one consolidated signal → 5 ordered, non-racing listener writes

## Context

<read_first>
- `remotion/src/SmartAggregationProblems.tsx` — FanoutExplosionSlide for styling reference
- `remotion/src/SmartAggregationSolution.tsx` — TwoPhasePipelineSlide for pipeline reference
- `remotion/src/ConcurrencyControl.tsx` — reference for side-by-side comparison layout
- `remotion/src/components/Nodes.tsx` — COLORS, GRADIENTS
- `modular-monolith/src/kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts` — real aggregator logic: read to understand what "consolidated state" means concretely (which fields are aggregated)
- `remotion/script-flow.md` — SMART-10 description
</read_first>

## Tasks

### Task 1 — NaiveExplosionSlide (before: chaos)

<action>
Create `NaiveExplosionSlide` — "Before" view: naive project deletion.

Header chip: "❌ WITHOUT AGGREGATION" color:`COLORS.danger`

Sequence of events to animate (each beat is ~20 frames apart):

Beat 1 (delay:5): Show central event node "💥 DELETE project-abc" at top:320, left:540, w:200, `COLORS.danger`

Beat 2 (delay:15): Show 5 listener nodes appearing simultaneously (all same delay) fanning right:
- `ChangeProjectMemberCount` top:100, left:800
- `DeleteProjectTask` top:200, left:860
- `PurgeTeamMemberships` top:300, left:880
- `SyncTeamTaskCount` top:400, left:860
- `UpdateUserProjectCount` top:500, left:800
All color:`COLORS.warning`, w:230

Beat 3 (delay:20): 5 arrows from event → all listeners, all same color `COLORS.danger`

Beat 4 (delay:35): Three "⚠ RACE" badges appear:
- badge 1: "Listener C reads tasks_count = 5 (stale)" near top:250, left:780, `COLORS.danger`
- badge 2: "Listener A reads same stale value" near top:350, left:780, `COLORS.danger`
- badge 3: "Both write 4 → count wrong" near top:450, left:780, `COLORS.danger`

Beat 5 (delay:55): Bottom warning: "Each listener has no awareness of the others"

Use `Appear` helper. All timing in frames (30fps base).
</action>

<acceptance_criteria>
- 5 listener nodes all appear at similar times (simultaneous fan-out is visually obvious)
- Race condition badges appear after the listener arrows
- Bottom warning appears last
- No TypeScript errors
</acceptance_criteria>

---

### Task 2 — AggregatedDeletionSlide (after: order)

<action>
Create `AggregatedDeletionSlide` — "After" view: the same deletion with the aggregator.

Header chip: "✅ WITH AGGREGATION" color:`COLORS.success`

Sequence:

Beat 1 (delay:5): Show `📨 DOMAIN_EVENTS` node at top:120, left:30, w:170, `COLORS.warning`

Beat 2 (delay:12): Show `⚙️ BatchAggregator` node at top:260, left:240, w:190, `COLORS.accent`
- sub text: "batches 3 events in 50ms window"

Beat 3 (delay:20): Arrow DOMAIN_EVENTS → BatchAggregator, `COLORS.warning`, label:"3 raw events"

Beat 4 (delay:30): Show code snippet card at top:380, left:200, w:250, `COLORS.accent` border:
```
consolidatedState = {
  membersToRemove: 3,
  tasksToDelete: 47,
  teamsToUnlink: 2
}
```
(use a monospace dark code block card)

Beat 5 (delay:40): Show `📨 PROJECT_AGGREGATED` node at top:120, left:500, w:210, `COLORS.accent`

Beat 6 (delay:48): Arrow BatchAggregator → PROJECT_AGGREGATED, label:"1 signal", `COLORS.accent`

Beat 7 (delay:56): Show 3 listener nodes appearing one-by-one (staggered 8 frames each) at left:780:
- `ChangeProjectMemberCount` top:140 delay:56 `COLORS.accent3`
- `DeleteProjectTask` top:260 delay:64 `COLORS.accent3`
- `UpdateUserProjectCount` top:380 delay:72 `COLORS.accent3`

Beat 8 (delay:65,73,81): Arrows PROJECT_AGGREGATED → each listener staggered

Beat 9 (delay:85): PostgreSQL node at top:260, left:1060, `COLORS.accent3`

Beat 10 (delay:88,93,98): Arrows from each listener → DB staggered

Beat 11 (delay:105): Green banner "All 3 side-effects applied in order · Zero race conditions"

Use `Shell` glass panel wrapper.
</action>

<acceptance_criteria>
- The aggregated signal (single arrow from BatchAggregator to AGGREGATED topic) is visually distinct from the naive fan-out
- Code snippet card shows consolidated state legibly
- Listeners appear staggered (sequential, not simultaneous)
- Success banner appears at the end
- No TypeScript errors
</acceptance_criteria>

---

## Verification

<must_haves>
- [ ] `SmartAggregationExample.tsx` exists in `remotion/src/`
- [ ] Exports: `NaiveExplosionSlide`, `AggregatedDeletionSlide`
- [ ] Naive slide makes the "simultaneous chaos" obvious visually
- [ ] Aggregated slide makes the "single signal → ordered writes" obvious
- [ ] `tsc --noEmit` passes
</must_haves>
