# Taskinator High-Performance Video Engine (Remotion)

Welcome to the **Taskinator Visual Engine**, an advanced React-based programmatic video suite engineered using **Remotion**. It orchestrates 18 high-fidelity, frame-accurate architectural deep-dives and front-end simulations illustrating the scaling capabilities of Taskinator-v2.

---

## 🎬 The Master Presentation

The system is driven by a dynamic scheduler: **[MasterPresentation](src/MasterPresentation.tsx)**.

Rather than manual timeline hardcoding, the presentation accumulates track lengths programmatically, automatically subtracting `15 frames` per transition boundary to interpolate seamless **cinema-grade crossfades**.

- **Total Output Length:** Exactly **29,885 frames** (~16 minutes 36 seconds @ 30fps)
- **Resolution:** 1280x720 @ 30fps
- **Transitions:** 15-frame opacity dissolves (`SceneWrapper` interpolation)

---

## 🚀 Quick Start Commands

### 1. Install Dependencies
Ensure you have Bun installed on your Mac/Linux host.
```bash
bun install
```

### 2. Launch Interactive Player
Preview composition branches, scrub the timeline, or adjust springs in the browser.
```bash
bun run dev
```

### 3. Render Master Presentation
Renders the overarching `MasterPresentation` pipeline to an `.mp4` asset.
```bash
bunx remotion render MasterPresentation out/master.mp4
```

### 4. Validate Types & Gating
Run the ultimate static safety pass to ensure zero compilation defects.
```bash
npx tsc
```

---

## 📐 Core Design & Architecture Rules

To maintain absolute frame accuracy across cloud rendering clusters, this project enforces strict design paradigms:

### 1. Zero CSS Transitions
🚨 **Raw CSS animations, Tailwind `transition-*`, and standard CSS `@keyframes` are STRICTLY FORBIDDEN.**
Implicit browser layout engines are non-deterministic. All visual transformations must use stateless, sequence-local Remotion hooks:
```typescript
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const value = spring({
  frame: frame - START_OFFSET,
  fps,
  config: { damping: 200 },
  durationInFrames: 30,
});
```

### 2. Clamping & Safety
Always clamp frame offsets to ensure layouts never display negative progressions or bounce beyond stable endpoint values.

### 3. Visual Theming
Draw from standard primitives defined in project files:
- **Backgrounds:** Unified deep-dark radial gradient (`GRADIENTS.bg`).
- **Typography:** Consistently styled code fonts (`monospace`) and premium Sans-Serif weights.
- **Borders:** Thin transparent-neon borders (`border: 1px solid rgba(255,255,255,0.1)`).

---

## 📋 The Composition Matrix

The following matrix tracks all 19 operational registries within **[Root.tsx](src/Root.tsx)**:

| Composition ID | Component Source | Duration (f) | Purpose |
| :--- | :--- | :---: | :--- |
| **`MasterPresentation`** | `MasterPresentation.tsx` | **29,885** | **Grand Orchestrator (All Scenes)** |
| `FeatureShowcase` | `FeatureShowcase.tsx` | 810 | Product hook & platform intro |
| `SchemaDesign` | `SchemaDesign.tsx` | 3,360 | ER-Schema & Materialized Paths |
| `SyncArchitecture` | `SyncArchitecture.tsx` | 3,750 | Event Bus & Sync/Async Flows |
| `AsyncProblems` | `AsyncProblems.tsx` | 1,620 | Dual-Writes & Lost Events |
| `TransactionalOutbox` | `TransactionalOutbox.tsx` | 2,820 | Atomic DB Relays & wCTEs |
| `UpgradedAsyncFlow` | `UpgradedAsyncFlow.tsx` | 930 | Clean distributed processing |
| `ConcurrencyControl` | `ConcurrencyControl.tsx` | 1,560 | Delta Updates & Optimistic Lock |
| `SmartAggregation` | `SmartAggregation.tsx` | 3,660 | Batch-pooling & 10k RPS scaling |
| `ChunkedDeletion` | `ChunkedDeletion.tsx` | 1,950 | Pac-Man cascade purge mechanics |
| `RealtimeSSE` | `RealtimeSSE.tsx` | 3,090 | SSE, Redis Sub, & Client pushes |
| `AutopilotOverview` | `AutopilotOverview.tsx` | 900 | Event-driven Automator Loop |
| `ConditionEvaluator` | `ConditionEvaluator.tsx` | 1,200 | Nested Boolean logic trees |
| `ActionChain` | `ActionChain.tsx` | 900 | Atomic execution linked-lists |
| `LoopDetector` | `LoopDetector.tsx` | 900 | Infinite cycle depth blocker |
| `VisualConditionBuilder`| `VisualConditionBuilder.tsx` | 900 | XYFlow-to-JSON Serializer UI |
| `ActionPipelineEditor` | `ActionPipelineEditor.tsx` | 900 | Latency Race & Optimistic Toggles |
| `DynamicConfig` | `DynamicConfig.tsx` | 600 | Elastic spring config modal UI |
| `FinalArchitecture` | `FinalArchitecture.tsx` | 1,290 | Monolithic cluster grand map |

---

*Engineered with precision. Maintained with stateless safety.*
