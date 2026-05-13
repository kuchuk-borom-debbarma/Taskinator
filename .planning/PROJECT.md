# Taskinator — Architecture Video

## What This Is

A Remotion-powered video series explaining how the Taskinator orchestration engine works, presented for a YouTube technical audience. The video follows an evolutionary narrative: start with a naive working solution, expose its real-world failure modes, then introduce the architectural upgrade that fixes it — repeating this pattern through 4 evolutionary phases until reaching a 10k RPS event-driven system.

## Core Value

A technically rigorous, visually compelling walkthrough that shows *why* each architectural decision was made — not just what the final system looks like.

## Requirements

### Validated

*These exist as polished Remotion compositions in `remotion/src/`:*

- ✓ **Feature showcase** — Product context: Projects, Teams, Members, Task graph — `FeatureShowcase`
- ✓ **Schema design** — ER tables with animated FK lines — `SchemaDesign`
- ✓ **N+1 query problem** — Naive aggregation at read time — `QueryProblem` (embedded in SchemaDesign)
- ✓ **Denormalization solution** — Pre-stored counts on entity row — `DenormalizationSolution`
- ✓ **Denormalization write amplification** — Race condition on concurrent updates — `DenormalizationDrawback`
- ✓ **Task graph traversal problem** — O(depth) recursive queries — `TaskLinkProblem`
- ✓ **Closure table solution** — Precomputed transitive reachability — `ClosureTableSolution`
- ✓ **Closure table write cost** — O(ancestors × descendants) on each link add — `ClosureTableDrawback`
- ✓ **Synchronous baseline flows** — Create Task, Create Link, Read Project (3 flows) — `SyncArchitecture`
- ✓ **Thread blocking problem** — Sync writes stall threads under load — `BlockingProblem`
- ✓ **Async intro + flows** — Fire-and-forget side effects — `AsyncSolution`
- ✓ **Dual-write problem** — DB write succeeds, event publish fails — `AsyncProblems`
- ✓ **Transactional Outbox pattern** — Atomic CTE + outbox relay + Kafka — `TransactionalOutbox`
- ✓ **Upgraded async flow comparison** — Before/after with outbox guarantee — `UpgradedAsyncFlow`
- ✓ **Concurrency & optimistic locking** — Version column + delta updates — `ConcurrencyControl`

### Active

- [ ] **Smart event aggregation composition** — Two-phase aggregation: BatchAggregator → Execution Listeners with idempotency
- [ ] **Chunked background deletion composition** — Self-signaling chunked cascade delete via Kafka re-publish
- [ ] **Real-time SSE composition** — Kafka → Redis pub-sub bridge → GraphQL WebSocket subscriptions
- [ ] **Final unified architecture composition** — Complete system diagram + metrics callout + outro

### Out of Scope

- Voiceover/narration audio — visual-only compositions (subtitles/captions can be added later)
- Auth/identity service walkthrough — out of this video's scope (different concern)
- Production deployment pipeline — not relevant to the architecture story
- Performance benchmarks/numbers — the video explains *why* not *what the numbers are*

## Context

The existing codebase at `remotion/` is a mature Remotion project (React, TypeScript, Bun) with:
- A complete design system: `COLORS`, `GRADIENTS`, `Shell`, `Appear`, `Arrow`, `SNode` primitives
- All compositions are 1280×720 @ 30fps
- Animation style: `spring()` based, glassmorphism panels, Inter font, dark navy gradient bg
- Sub-scenes are built as separate `.tsx` files and embedded via `<Sequence>` inside the parent composition
- The `script-flow.md` in `remotion/` is the authoritative narrative reference (updated 2026-05-13)

The next 4 compositions must match the existing design system exactly so the final render is visually consistent.

## Constraints

- **Tech stack**: Remotion + React + TypeScript — no new dependencies
- **Design consistency**: Must match existing `Shell`, `COLORS`, `GRADIENTS`, `spring()` patterns
- **Granularity**: Each composition should have enough slides to fully explain the concept (this is a deep-dive, not a summary)
- **Review gate**: Each composition is built and reviewed before the next begins
- **Resolution**: 1280×720 @ 30fps (all compositions must match)
- **No parallelization**: Sequential delivery — one composition at a time for human review

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Evolutionary narrative (problem → solution) | Gives viewer the "why" not just the "what" — more memorable for technical audience | ✓ Good — established in SyncArchitecture RoadmapSlide |
| Sub-scenes embedded in parent via `<Sequence>` | Keeps Root.tsx clean, allows segment-level reuse | ✓ Good — used throughout SchemaDesign and SyncArchitecture |
| Fine granularity (many slides per topic) | YouTube technical audience expects depth, not overview | — Pending |
| Sequential composition delivery with review | Each phase reviewed before the next to catch narrative or design issues | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-13 after initialization*
