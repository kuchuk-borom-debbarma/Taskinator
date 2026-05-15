# Implementation Plan: Phase 18 - Autopilot UI Visuals

This plan directs the creation and validation of three new visual compositions mapping the frontend capabilities of the Autopilot administration interfaces (Serialization, Optimistic UI, and Overlays).

---

## Proposed Wave Execution

### 🌊 Wave 1: Setup & Split-Pane Serialization
Assemble registration shells and implement the visual serialization transforming nodes into functional execution JSON.

#### 1. [MODIFY] [Root.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/Root.tsx)
- **Goal:** Register three new Compositions at standard sizes:
  - `VisualConditionBuilder`: 900 frames (30 seconds)
  - `ActionPipelineEditor`: 900 frames (30 seconds)
  - `DynamicConfig`: 600 frames (20 seconds)

#### 2. [NEW] [VisualConditionBuilder.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/VisualConditionBuilder.tsx)
- **Goal:** Build a dual-pane interface (`D-01`).
- **Left Pane:** Standard absolute layout XYFlow blocks connected by rigid links against a dotted grid background.
- **Right Pane:** Dark terminal JSON code screen.
- **Kinetic Mechanics:** Glowing SVG packet circles translate across the gap at scheduled intervals, triggering step-by-step line reveals in the terminal view.

---

### 🌊 Wave 2: Latency Comparison Tracks
Develop the visual side-by-side performance contrast demonstrating immediate user feedback.

#### 3. [NEW] [ActionPipelineEditor.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/ActionPipelineEditor.tsx)
- **Goal:** Construct two comparative horizontal tracks (`D-02`).
- **Upper Lane (Standard):** Toggling display triggers rotating spinner. Retains loading state for 120 frames (4s) before snap-finishing to Active.
- **Lower Lane (Optimistic):** Instantly flips switch to Green/Active. Fires radiating circle ripple. Subtly resolves background sync watermark at the same 120-frame boundary.

---

### 🌊 Wave 3: Elastic Overlays & Verification
Create focused administrative modal overlays and execute the final TypeScript compiler security pass.

#### 4. [NEW] [DynamicConfig.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/DynamicConfig.tsx)
- **Goal:** Render elastic spring configuration modal (`D-03`).
- **Underlay:** Unblurred static dashboard grid.
- **Popup Trigger:** Uses spring formula `{ damping: 12, stiffness: 100 }` to pop glassmorphic modal to scale `1.0`, while background blurs using `backdrop-filter: blur(...)` interpolation.
- **Form Items:** Webhook input textbox, styled dropdown select menu, and active cascading fallback checkmark cards.

---

## 🔎 Verification Plan

### Automated Tests
- Execute quality compilation gate command:
  ```bash
  npx tsc
  ```
- Validates zero unused variable warnings, absolute import integrity, and static typing constraints.

### Manual Verification
- Ensure all timelines are wrapped in precise `<Sequence layout="none">` tags to maintain consistent scaling boundaries.
