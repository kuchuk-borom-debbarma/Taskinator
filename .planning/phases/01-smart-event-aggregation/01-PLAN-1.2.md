---
plan: 1.2
title: Two-Phase Solution Diagram
phase: 1
wave: 2
depends_on: [1.1]
files_modified:
  - remotion/src/SmartAggregationSolution.tsx
autonomous: true
requirements:
  - SMART-05
  - SMART-06
  - SMART-07
  - SMART-08
  - SMART-11
---

# Plan 1.2 — Two-Phase Solution Diagram

## Goal

Create `SmartAggregationSolution.tsx` — exports two slides that introduce and visualise the two-phase aggregation solution:

1. **SolutionIntroSlide** — introduces the concept: "Two phases separate concerns"
2. **TwoPhasePipelineSlide** — the full animated pipeline diagram (BatchAggregator layer → `*_AGGREGATED` topic → Execution Listeners → DB)

## Context

<read_first>
- `remotion/src/SmartAggregationProblems.tsx` — import same Shell/SNode/Arrow/Appear helpers (or re-declare locally)
- `remotion/src/TransactionalOutbox.tsx` — full reference for complex multi-node pipeline diagrams
- `remotion/src/components/Nodes.tsx` — COLORS, GRADIENTS
- `remotion/script-flow.md` — Phase 5 solution description
- `modular-monolith/src/kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts` — real implementation reference (read to understand actual consumer group names and topic names)
</read_first>

## Tasks

### Task 1 — SolutionIntroSlide

<action>
Create `SolutionIntroSlide` — a concept-introduction slide before showing the full diagram.

Layout (glass panel):
- Centered column layout
- At delay:5: large "✦" icon in `COLORS.accent`, fontSize:48
- At delay:12: h2 title "Two-Phase Aggregation" fontSize:38 fontWeight:900 `COLORS.ink`
- At delay:20: subtitle "Separate event consolidation from side-effect execution" `COLORS.muted` fontSize:16
- At delay:30: two side-by-side cards:
  - Left card (border: `COLORS.warning`): "Phase 1 — Aggregator" / "Batches raw events, computes consolidated state, publishes one aggregated signal"
  - Right card (border: `COLORS.accent3`): "Phase 2 — Listeners" / "Each listener reads one aggregated signal, performs one targeted DB write"
- At delay:55: bottom chip in `COLORS.accent`: "Result: ordered, idempotent, non-racing side effects"

Use `Appear` helper with y=20 default slide-up.
</action>

<acceptance_criteria>
- Two phase cards are visible and styled correctly by frame 60
- Bottom chip appears after the cards
- No TypeScript errors
</acceptance_criteria>

---

### Task 2 — TwoPhasePipelineSlide

<action>
Create `TwoPhasePipelineSlide` — the main architecture diagram showing the full event pipeline.

Layout (1280×720, horizontal left-to-right flow):

**Row 1 — Raw events layer (y≈120):**
- `📨 DOMAIN_EVENTS` Kafka topic node: left:30, top:120, w:170, color:`COLORS.warning`, delay:5

**Row 2 — Aggregator layer (y≈270):**
- `⚙️ BatchAggregator` node: left:260, top:270, w:200, color:`COLORS.accent`, delay:15
  - sub: "consumer-group: project-aggregator"
- Label between rows: "FOR UPDATE\nSKIP LOCKED" in `COLORS.muted` fontSize:9 at left:290, top:210

**Arrow 1:** DOMAIN_EVENTS right edge → BatchAggregator left edge (y≈300), color:`COLORS.warning`, delay:20, label:"raw events (batch)"

**Row 3 — Aggregated topic (y≈120, right side):**
- `📨 PROJECT_AGGREGATED` Kafka topic node: left:520, top:120, w:210, color:`COLORS.accent`, delay:28

**Arrow 2:** BatchAggregator top edge → PROJECT_AGGREGATED bottom (diagonal or elbow), color:`COLORS.accent`, delay:32, label:"1 aggregated signal"

**Row 4 — Execution listeners (y≈270, right side), 3 listeners stacked:**
- `✓ ChangeProjectMemberCount` left:790, top:160, w:240, color:`COLORS.accent3`, delay:38
- `✓ DeleteProjectTask` left:790, top:270, w:240, color:`COLORS.accent2`, delay:43
- `✓ UpdateUserProjectCount` left:790, top:380, w:240, color:`COLORS.accent`, delay:48

**Arrows 3,4,5:** PROJECT_AGGREGATED right edge → each listener left edge, color:`COLORS.accent`, delays:40,45,50

**Row 5 — DB (far right):**
- `🗄️ PostgreSQL` node: left:1090, top:270, w:155, color:`COLORS.accent3`, delay:55

**Arrows 6,7,8:** Each listener right edge → DB left edge, color:`COLORS.accent3`, delays:58,63,68

**Phase labels (background text):**
- At left:30, top:70: "PHASE 1" chip, `COLORS.warning` border
- At left:790, top:70: "PHASE 2" chip, `COLORS.accent3` border

**Divider:** vertical SVG line at x=760, y1=60, y2=580, stroke `rgba(255,255,255,0.06)`, strokeDasharray="4 4"

All nodes use `SNode` pattern: position:absolute, spring(damping:16, stiffness:80), dark glass card.
All arrows use SVG `Arrow` pattern with animated line + arrowhead + glow.
</action>

<acceptance_criteria>
- All 7 nodes visible with entrance animations
- Arrows animate in correct order (raw → aggregator → aggregated topic → listeners → DB)
- Phase 1 / Phase 2 chips visible
- Vertical divider visible
- No element overflows 1280×720
- No TypeScript errors
</acceptance_criteria>

---

## Verification

<must_haves>
- [ ] `SmartAggregationSolution.tsx` exists in `remotion/src/`
- [ ] Exports: `SolutionIntroSlide`, `TwoPhasePipelineSlide`
- [ ] `tsc --noEmit` in `remotion/` passes
- [ ] Pipeline diagram has clear visual separation between Phase 1 and Phase 2 layers
</must_haves>
