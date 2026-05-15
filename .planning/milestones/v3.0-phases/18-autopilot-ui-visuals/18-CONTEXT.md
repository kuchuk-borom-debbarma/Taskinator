# Phase 18: Autopilot UI Visuals - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver three brand-new visual compositions in Remotion illustrating the newly completed administration interfaces for the Autopilot v2.0 platform:
1. **AUTOUI-01 (`VisualConditionBuilder`)**: Show React XYFlow node setups converting dynamically into logical JSON trees.
2. **AUTOUI-02 (`ActionPipelineEditor`)**: Visualize drag-and-drop step assemblies contrasted against zero-latency optimistic UI toggling.
3. **AUTOUI-03 (`DynamicConfig`)**: Demonstrate config overlay panels and smart fallback selector interfaces.
</domain>

<decisions>
## Implementation Decisions

### XYFlow Serialization Visual Style (`VisualConditionBuilder`)
- **D-01:** Implement a **Split-Screen Transformation** layout for maximum reader comprehension. The Left pane renders visual XYFlow node blocks; individual data packets stream across the gap, appending/populating a live syntax-highlighted code block inside the Right pane as serialization executes.

### Optimistic Toggle Comparative Visualization (`ActionPipelineEditor`)
- **D-02:** Build a **Latency Race Layout** to emphasize immediate interactivity. Split the slide into two vertical tracks:
  - **Track 1 (Standard)**: Clicks the toggle, displays a buffering spinner, and exhibits a ~4-second execution lag before state change.
  - **Track 2 (Optimistic)**: Clicks the toggle and instantly pops into "Active" state with a green visual ripple, resolving API latency silently in the background watermark.

### Config Smart Form Entrance Style (`DynamicConfig`)
- **D-03:** Utilize the **Glassmorphic Modal Pop** mechanic. Forms must scale forward from the center of the viewport using an elastic spring dampener (e.g., `stiffness: 100, damping: 12`), while the background dashboard applies a strong `backdrop-filter: blur(20px)` to emphasize focus.

### the agent's Discretion
- Specific mock-JSON node payloads inside the serializing text panel.
- Exact pixel sizes and border-radii for the toggle switches.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### System Documents
- `.planning/ROADMAP.md` — The Milestone v3.0 scheduling constraints.
- `.planning/REQUIREMENTS.md` — Functional specifications for the frontend UI visuals category.
- `.planning/PROJECT.md` — Background on XYFlow serialization and Optimistic Queries value statements.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [Nodes.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/components/Nodes.tsx): Uses global `COLORS` palette to align buttons/switches with standard infrastructure aesthetics.
- [TitleCard.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/components/TitleCard.tsx): Initial slide presentation headers.
- [UpgradedAsyncFlow.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/UpgradedAsyncFlow.tsx): Exemplar for split-lane layouts comparing old vs new system mechanics.

### Established Patterns
- **Spring Dynamics**: Implement `stiffness: 100` and `damping: 12` on modals to provide the high-end tactile "bounce" characteristic.
- **Strict Interpolation Clamping**: All timing interpolations must carry `{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }`.
</code_context>

<specifics>
## Specific Ideas
- "XY flow serialization style we can go with whatever is easier for the user to understand": Selected Split-Screen.
- "optimistic toggle visualization, we can show option A": Selected Latency Race comparing standard spinner to optimistic toggle.
- "smart form entrance. We can do a glossmorphic model pop": Selected Glassmorphic elastic modal pop.
</specifics>

<deferred>
## Deferred Ideas
None — all decisions strictly constrained to Phase 18 roadmap boundaries.
</deferred>

---

*Phase: 18-Autopilot UI Visuals*
*Context gathered: 2026-05-16*
