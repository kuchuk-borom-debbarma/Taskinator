# Phase 20: Autopilot Hook Integration - Context

**Gathered:** 2026-05-16T01:03:00Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate a premium visual highlight segment demonstrating the Project Autopilot System directly inside the opening introductory hook composition `FeatureShowcase`.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
The user explicitly deferred all design, layout, and animation decisions to the agent ("You can decide what the autopilot note is going to look like. You decide everything.").

- **🎨 Visual Autopilot Asset (D-01):** High-Fidelity Pulsating Beacon Core. The `AutopilotNode` will be designed as a glassmorphic neon core with continuous repeating outer rings radiating outward via stateless spring loops. It will feature a glowing Electric Blue theme (`COLORS.accent`) with the text `⚡ AUTOPILOT ENGINE`.
- **⚡ Auto-Fulfillment Mechanics (D-02):** Targeted Completion Pulse + Color Cascade. The Autopilot engine will project static/animated signal lines towards downstream task links. Downstream tasks (`Cooking` and `Service`) will gracefully transition to solid Emerald backgrounds (`COLORS.accent3`) upon receiving the pulse signal, representing programmatic completion.
- **📏 Canvas Position (D-03):** Center-Stage Materialization. The Autopilot Engine Node will materialize in the absolute vertical and horizontal center of the grid (between the wide row of Teams and the grid of Tasks), commanding central visual weight.
- **⏱️ Presentation Timings (D-04):**
  - Composition extended by 150 frames (totaling 960 frames / 32 seconds).
  - Autopilot Sequence Segment: Starts at frame `fps * 15.0` (Segment 11.5 "Creating Orchestration Links..." finishes and holds).
  - At Segment Frame `fps * 15.0`, the `ProgressIndicator` updates to "⚡ Activating Autopilot Engine...".
  - The `AutopilotNode` will fade-in and scale-up from `fps * 15.0` to `fps * 16.5`.
  - The signal pulse propagates to tasks from `fps * 16.5` to `fps * 18.0`.
  - Tasks undergo emerald transition from `fps * 18.0` to `fps * 19.5`.
  - The scene holds until the fade-out transition begins.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Requirements
- `.planning/REQUIREMENTS.md` — Defines REQ-401 through REQ-407 outlining timing expansion and visual asset scope.
- `remotion/README.md` — Standard rules for stateless spring hook implementations and forbidden CSS transitions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `remotion/src/components/Nodes.tsx`: Houses the visual base structures (`ProjectNode`, `TeamNode`, `TaskNode`) and standard styling constants (`COLORS`, `GRADIENTS`). We will add `AutopilotNode` here.
- `remotion/src/components/Link.tsx`: Contains the `DependencyLink` which uses cubic bezier curves and animated dash-offsets. Excellent reference for programming the Autopilot pulse rays.

### Established Patterns
- `AnimatedItem`: A reusable coordinate interpolator inside `FeatureShowcase.tsx` that manages clean node translation using pure springs.
- `ProgressIndicator`: Step-sequencer based on segment frames inside `FeatureShowcase.tsx`.

### Integration Points
- `remotion/src/FeatureShowcase.tsx`: The primary component receiving the new segment and nodes.
- `remotion/src/Root.tsx`: Composition registry requiring frame length increment update (`FeatureShowcase` updated to `960` frames).

</code_context>

<specifics>
## Specific Ideas
- The downstream Tasks (`Cooking` and `Service`) should start with the standard navy background and, upon receiving the Autopilot Pulse, scale slightly via `spring()` and transition their background color smoothly to an active Emerald Glass style.

</specifics>

<deferred>
## Deferred Ideas
None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-Autopilot Hook Integration*
*Context gathered: 2026-05-16T01:03:00Z*
