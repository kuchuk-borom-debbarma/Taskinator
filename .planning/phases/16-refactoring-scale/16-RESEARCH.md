# Phase 16 Research: Refactoring Scale

## Core Objective
Stabilize the secondary layer of visualizations (scaling, concurrency, transactional outbox) to handle viewport shifts and layout boundaries safely.

## Analysis of Target Files

### 1. AsyncProblems.tsx
Contains "Dual-Write & Lost Event" problems:
- `Header` (L25) — `translateY(${interpolate(s,[0,1],[-12,0])}px)` needs clamping and Easing.bezier.
- `Banner` (L40) — `translateY(${interpolate(s,[0,1],[20,0])}px)` needs clamping.
- `IntroSlide` (L127, L134) — Needs absolute container clamps.
- **Unused Variables**: Already detected `f` at line 151 and `pulse` at line 201. Must comment out to clear `tsc`.

### 2. TransactionalOutbox.tsx
Demonstrates Outbox Pattern + Transaction Isolation:
- Utility function `tx` (L8) — `translateY(${interpolate(s,[0,1],[-20,0])}px)` must be clamped.
- `Node` (L26) — scale transform needs bounding.
- `StatusBadge` (L78) — translation needs clamping.
- `Banner` (L85) — bottom pop-in needs clamping.
- Inter-thread color interpolates (L339, L357) — verify bounds.

### 3. UpgradedAsyncFlow.tsx
Illustrates the fixed async pipeline:
- `Header` (L26) — translateY clamp needed.
- `StepItem` (L102) — translateX clamp needed.
- `Banner` (L120) — translateY clamp needed.
- Sequence wraps — replace any legacy implicit coordinate renders with `layout="none"`.

### 4. ConcurrencyControl.tsx
Shows concurrent task modifications and locking:
- `Node` (L25) — needs scale and translation clamps.
- `Banner` (L96) — pop-in needs bezier bounding.
- **Unused Variables**: Already detected `interpolateColors` (L2) and `angle` (L42).

## Recommended Fix Pattern
Inject:
```typescript
import { ..., Easing } from 'remotion';
```
And update all raw interpolates:
```typescript
interpolate(val, [inMin, inMax], [outMin, outMax], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })
```
Remove or comment out `noUnusedLocals` violating items detected by TypeScript.
Ensure `premountFor` is absent from all files.
