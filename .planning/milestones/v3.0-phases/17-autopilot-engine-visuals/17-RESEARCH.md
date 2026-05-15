# Phase 17 Research: Autopilot Engine Visuals

**Phase:** 17 — Autopilot Engine Visuals
**Date:** 2026-05-16
**Status:** ## RESEARCH COMPLETE

We have conducted an investigation into the codebase architecture, shared rendering assets, and spatial design constraints to prepare the visual engineering strategy for the new Autopilot compositions.

---

## 1. Composition Registration Architecture

We analyzed [Root.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/Root.tsx) to map out composition constraints. All existing visualizers operate under:
- **Dimensions**: `1280px x 720px` (16:9 landscape)
- **Framerate**: `30 FPS`
- **Frame Scaling**: Standard `spring` scaling targets mapped from internal constants.

### Proposed Frame & Duration Targets for Autopilot:
| Composition | Component | Duration | Frame Count (`30fps`) |
|---|---|---|---|
| `AutopilotOverview` | `AutopilotOverview` | 30s | `900` |
| `ConditionEvaluator` | `ConditionEvaluator` | 40s | `1200` |
| `ActionChain` | `ActionChain` | 30s | `900` |
| `LoopDetector` | `LoopDetector` | 30s | `900` |

---

## 2. Component Asset & Utility Map

### A. Layout Foundation
We identified the standard glassmorphic layout container pattern from successful refactors (e.g. `ConcurrencyControl`). Every new file should implement an internal wrapper:
```typescript
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<AbsoluteFill style={{ background: GRADIENTS.bg }}>
		<AbsoluteFill style={{ padding: 30 }}>
			<div style={{ 
				flex: 1, position: 'relative', overflow: 'hidden',
				background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(50px)',
				borderRadius: 30, border: '1.5px solid rgba(255, 255, 255, 0.08)',
				boxShadow: '0 50px 120px rgba(0, 0, 0, 0.7)' 
			}}>
				{children}
			</div>
		</AbsoluteFill>
	</AbsoluteFill>
);
```

### B. Shared Assets to Import:
- **[Nodes.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/components/Nodes.tsx)**:
  - `COLORS` & `GRADIENTS`: Use for maintaining unified theme styling.
  - `ProjectNode`, `MemberNode`, `TaskNode`: For modeling task/event inputs entering the Autopilot engine.
- **[Link.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/components/Link.tsx)**:
  - `DependencyLink`: Serves as the visual paradigm for logic paths and linking nodes. We must extend or replicate its SVG path-drawing logic to allow for dynamic color pulsing (Green/Red) requested in `17-CONTEXT.md` (D-01).
- **[TitleCard.tsx](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/remotion/src/components/TitleCard.tsx)**:
  - Serves as the intro card for the start of every major Composition scene.

---

## 3. Scene-Specific Implementation Strategies

### I. `AutopilotOverview.tsx`
- **Goal**: Event-driven automation trigger loop.
- **Structure**: 
  1. Event Dispatch (Left: Client/API dispatching "Task Updated").
  2. Core Engine (Center: Evaluator logic).
  3. Database Pipeline (Right: Action mutation writes).
- **Timing**: Sequential arrow triggers feeding left to right.

### II. `ConditionEvaluator.tsx`
- **Goal**: Nested visual tree logic.
- **Approach**:
  - Map static grid coordinates for tree: `Root (AND)` -> `Branch A (Condition 1)` & `Branch B (OR)` -> `Sub-Branch (Condition 2 & 3)`.
  - Define evaluated boolean state per node.
  - Draw custom tree links that interpolate from default `#00E5FF` to `COLORS.success` or `COLORS.danger` based on timeframe.

### III. `ActionChain.tsx`
- **Goal**: Fail-fast linked list atomicity.
- **Approach**:
  - Display 3 horizontal action blocks: `[Action 1: Complete]` -> `[Action 2: Error!]` -> `[Action 3: Skipped]`.
  - Frame timings: Action 1 executes (Success). Connector line fires towards Action 2. Action 2 fails (Turns red).
  - Apply desaturation filter `filter: grayscale(100%) blur(1px)` and opacity drops to Action 3 instantly as connector locks at failure point.

### IV. `LoopDetector.tsx`
- **Goal**: Cycle blocking prevention.
- **Approach**:
  - Construct a circular SVG path (`cx, cy, r`).
  - Animate an "Event Packet" node revolving around the path.
  - Interpolate the rotation rate `degree` based on spring configs to simulate acceleration.
  - Overlay `AbsoluteFill` component carrying giant `CYCLE BLOCKED` warning styled with `backdropFilter: blur(15px)` and `boxShadow` when rotation frame hits cutoff.

---

## 4. TypeScript and Quality Constraints

- **Rigid Bounds**: Every interpolative animation must be clamped:
  `{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(...) }`
- **Timeline Hygiene**: Standard root wrappers must be encapsulated within:
  `<Sequence from={X} durationInFrames={Y} layout="none">`
- **No CSS Transitions**: Native `transition: all 0.3s` is explicitly forbidden for dynamic coordinates — reliance is 100% on Remotion frame mapping.
