# Phase 15 Research: Remotion Best Practices & Architectural Migration

The goal of this phase is to establish the definitive migration patterns for all existing Remotion compositions to conform perfectly with the `@~/.gemini/skills/remotion-best-practices` guidelines. This research outlines the architectural delta between current implementations and best practices.

## 1. Delta Analysis: Existing Code vs. Best Practices

| Pattern Category | Current Code Approach | Mandatory Best Practice Target |
| :--- | :--- | :--- |
| **Sequencing** | Raw `<Sequence>` without pre-buffering | **Always** use `premountFor={1 * fps}` to prevent flickering; set `layout="none"` where wrapping is not needed. |
| **Interpolations** | Linear `interpolate(x, [0, 1], [A, B])` with default extrapolation | **Always** specify `{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }`. Inject `Easing.bezier` for smooth entries. |
| **Physics (Springs)** | Omnipresent raw `spring()` | Retain `spring` for interactive impacts, but migrate standard fades, moves, and delays to optimized Bézier curves (`Easing.bezier`). |
| **Asset Loading** | Hardcoded URLs/paths | Mandate `staticFile('...')` wrapping for all local audio, images, and video clips to guarantee bundle inclusion. |

---

## 2. Mandatory Code Patterns (Reference Guide)

### A. Optimized Sequence Component
Every sequence wrapper must now look like this:

```tsx
import { Sequence, useVideoConfig } from "remotion";

// Within component body:
const { fps } = useVideoConfig();

return (
  <Sequence 
    from={startFrame} 
    durationInFrames={durationFrames} 
    premountFor={1 * fps} // CRITICAL FOR FLICKER PREVENTION
    layout="none"         // Prevents extra AbsoluteFill wrappers unless explicitly desired
  >
    <YourSubComponent />
  </Sequence>
);
```

### B. Safe Clamped Easing Interpolation
All linear frame interpolations must define explicit clamp behaviors to prevent bounding leaks:

```tsx
import { interpolate, Easing } from "remotion";

// Crisp UI entrance: decelerates smoothly without overshoot
const enterProgress = interpolate(
  frame, 
  [0, 45], 
  [0, 1], 
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  }
);
```

### C. Composed Motion Variable Strategy
Rather than creating multiple complex `interpolate` functions, derive a single normalized `0..1` curve and map subsequent layout properties to it:

```tsx
const moveCurve = interpolate(frame, [0, 60], [0, 1], {
  easing: Easing.out(Easing.cubic),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

// Derivative styles driven by one timeline variable
const x = interpolate(moveCurve, [0, 1], [startX, endX]);
const opacity = interpolate(moveCurve, [0, 1], [0, 1]);
```

---

## 3. Validation Checklist for Refactored Compositions
- [ ] No inline CSS `@keyframes`, transitions, or animations exist in styles.
- [ ] Every `<Sequence>` and `<Series.Sequence>` defines `premountFor={1 * fps}`.
- [ ] Every call to `interpolate(frame, ...)` contains an explicit options object with `clamp` parameters.
- [ ] Local static assets wrap their location paths inside `staticFile()`.
