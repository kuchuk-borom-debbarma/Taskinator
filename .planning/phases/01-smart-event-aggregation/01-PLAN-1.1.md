---
plan: 1.1
title: Fan-out Problem Slides
phase: 1
wave: 1
depends_on: []
files_modified:
  - remotion/src/SmartAggregationProblems.tsx
autonomous: true
requirements:
  - SMART-01
  - SMART-02
  - SMART-03
  - SMART-04
---

# Plan 1.1 — Fan-out Problem Slides

## Goal

Create `SmartAggregationProblems.tsx` — the problem section of the SmartAggregation composition. This file exports three named slides that will be sequenced by the root `SmartAggregation.tsx` in Plan 1.5:

1. **TitleSlide** — phase title card
2. **NaiveListenerSlide** — the naive one-listener-per-event architecture diagram
3. **FanoutExplosionSlide** — what happens when a project is deleted and N listeners all fire

## Context

Read these files before writing any code:

<read_first>
- `remotion/src/TransactionalOutbox.tsx` — reference for Shell pattern, SNode, Arrow, spring animation style
- `remotion/src/AsyncProblems.tsx` — reference for GlassShell, Hdr pattern
- `remotion/src/components/Nodes.tsx` — COLORS, GRADIENTS constants
- `remotion/src/components/TitleCard.tsx` — TitleCard component signature
- `remotion/script-flow.md` — narrative context for what each slide must explain
</read_first>

## Tasks

### Task 1 — TitleSlide

<action>
Create a named export `TitleSlide` in `remotion/src/SmartAggregationProblems.tsx`.

Use `<TitleCard title="Smart Event Aggregation" />` — import from `./components/TitleCard`.

The TitleCard already fades in/out via interpolate — no additional wrapper needed.
</action>

<acceptance_criteria>
- `TitleSlide` is a named export (`export const TitleSlide: React.FC = () => ...`)
- Renders `<TitleCard title="Smart Event Aggregation" />`
- No TypeScript errors
</acceptance_criteria>

---

### Task 2 — NaiveListenerSlide

<action>
Create `NaiveListenerSlide` — shows a naive architecture where each Kafka event type has one dedicated listener that writes directly to the DB.

Layout (1280×720 glass panel):
- Left column: Kafka topic node (`📨 Kafka Topic` label, `DOMAIN_EVENTS` sub, `COLORS.warning` border) at top:160, left:60, w:180
- Right column: 5 listener nodes staggered vertically at left:480, each w:230:
  - `ChangeProjectMemberCount` top:80 delay:15 color:COLORS.accent
  - `DeleteProjectTask` top:170 delay:22 color:COLORS.danger
  - `PurgeTeamMemberships` top:260 delay:29 color:COLORS.accent2
  - `SyncTeamTaskCount` top:350 delay:36 color:COLORS.success
  - `UpdateUserProjectCount` top:440 delay:43 color:COLORS.accent3
- Far right: PostgreSQL node (`🗄️ PostgreSQL`, `COLORS.accent3`) at top:260, left:840, w:180
- Animated arrows from Kafka → each listener (staggered delays 18,25,32,39,46)
- Animated arrows from each listener → DB (staggered delays 30,37,44,51,58)
- Appear at top-left: chip "NAIVE APPROACH" in `COLORS.danger`
- At frame 90: show a red warning badge bottom-center: "5 concurrent DB writes per event"

Use the `Shell` pattern (glass panel AbsoluteFill with padding:30) from `TransactionalOutbox.tsx`.
Use `SNode` component pattern (position absolute, spring scale+opacity, dark glass card, colored border).
Use `Arrow` SVG pattern (animated line from x1,y1 → x2,y2 with arrowhead marker).
Use spring config `{ damping: 16, stiffness: 80 }` for all nodes.
Helper: `const SP = (f, d, fps) => spring({ frame: f - d, fps, config: { damping: 16, stiffness: 80 } })`.
Helper: `const F = (s) => 30 * s`.
</action>

<acceptance_criteria>
- `NaiveListenerSlide` is a named export
- Kafka node, 5 listener nodes, DB node all appear with spring entrance animations
- Arrows animate from Kafka → listeners and listeners → DB with staggered timing
- "5 concurrent DB writes per event" warning badge appears at ~frame 90
- No overlapping elements at 1280×720
- No TypeScript errors
</acceptance_criteria>

---

### Task 3 — FanoutExplosionSlide

<action>
Create `FanoutExplosionSlide` — shows what happens during a project deletion: one event triggers all 5 listeners simultaneously, causing ordering chaos and DB contention.

Layout:
- Header chip: "THE PROBLEM" in `COLORS.danger`
- Title text top-left: "One Event, Five Side Effects"
- Sub: "listeners race each other — no guaranteed order"
- Central "💥 PROJECT_DELETED" event node: top:280, left:540, w:200, `COLORS.danger` border, appears at delay:5
- 5 listener nodes arranged in a semi-circle (top-right fan layout):
  - listener A top:100, left:800 delay:15
  - listener B top:190, left:860 delay:18
  - listener C top:280, left:880 delay:21
  - listener D top:370, left:860 delay:24
  - listener E top:460, left:800 delay:27
- Animated arrows from central event → each listener (rapid fire, all within 10 frames apart)
- At frame 90: show 3 overlapping "❌ DB CONFLICT" badges near the listener area, staggered by 5 frames each, color `COLORS.danger`
- At frame 110: show bottom warning: "Listener B assumes Listener A finished — but A hasn't started yet"

Use `Appear` helper: `const Appear = ({ at, children, y=18, x=0 }) => ...` with spring opacity+translateY.
</action>

<acceptance_criteria>
- Central event node appears and arrows fan out to 5 listeners visually
- DB conflict badges appear after the fan-out arrows (frame ≥ 90)
- Ordering warning text appears at frame ≥ 110
- All elements visible within 1280×720 bounds
- No TypeScript errors
</acceptance_criteria>

---

## Verification

<must_haves>
- [ ] `SmartAggregationProblems.tsx` exists in `remotion/src/`
- [ ] File exports: `TitleSlide`, `NaiveListenerSlide`, `FanoutExplosionSlide`
- [ ] `bun run build` (or `tsc --noEmit`) in `remotion/` passes with no errors
- [ ] All three slides render visible content at frame 0 and frame 60 (no blank screens)
</must_haves>
