# Phase 18: Autopilot UI Visuals - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 18-Autopilot UI Visuals
**Areas discussed:** XYFlow Serialization Style, Optimistic Toggle Comparative Visualization, Config Smart Form Entrance Style

---

## XYFlow Serialization Visual Style (`VisualConditionBuilder`)

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Split-Screen Transformation: visual nodes streaming data packet to structured JSON text. | ✓ |
| Option B | Canvas-Centric: cursor active connects nodes and hits standard Serialize action button. | |

**User's choice:** Option A
**Notes:** Adopted Option A directly based on user preference for "whatever is easier for the user to understand." Split-screen transformation offers clearest mental model.

---

## Optimistic Toggle Comparative Visualization (`ActionPipelineEditor`)

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Latency Race Layout: comparing slow standard roundtrip spinners vs optimistic immediate snap. | ✓ |
| Option B | Single Direct Toggle: Focuses on simple large 3D toggling with ripples in isolated dashboard. | |

**User's choice:** Option A
**Notes:** Direct selection. Captures architectural contrast between buffering interfaces and instant state.

---

## Config Smart Form Entrance Style (`DynamicConfig`)

| Option | Description | Selected |
|--------|-------------|----------|
| Option A | Glassmorphic Modal Pop: forward scaling elastic pop-up blinding dashboard behind bokeh. | ✓ |
| Option B | Pushing Sidebar Draw: sliding drawer enters right, dynamically squeezing left UI layout. | |

**User's choice:** Option A
**Notes:** Desired "glossmorphic model pop". Enforces elastic spring scaling from center viewport.

---

## the agent's Discretion
- Precision spring dampen numbers.
- Color highlights inside raw syntax panel.

## Deferred Ideas
None.
