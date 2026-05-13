---
plan: 1.5
title: Compose SmartAggregation Root + Register in Root.tsx
phase: 1
wave: 3
depends_on: [1.1, 1.2, 1.3, 1.4]
files_modified:
  - remotion/src/SmartAggregation.tsx
  - remotion/src/Root.tsx
autonomous: true
requirements:
  - SMART-01
  - SMART-02
  - SMART-03
  - SMART-04
  - SMART-05
  - SMART-06
  - SMART-07
  - SMART-08
  - SMART-09
  - SMART-10
  - SMART-11
  - SMART-12
---

# Plan 1.5 — Compose SmartAggregation Root + Register in Root.tsx

## Goal

- Create `SmartAggregation.tsx` — the root composition that sequences all slides from Plans 1.1–1.4 using `<Sequence>` blocks
- Register `SmartAggregation` in `Root.tsx` with correct `durationInFrames`
- Verify the composition renders in Remotion Studio

## Context

<read_first>
- `remotion/src/SchemaDesign.tsx` — reference for how sub-scene files are imported and composed with `<Sequence>` (lines 330–376 especially)
- `remotion/src/Root.tsx` — current composition registry (add new entry here)
- `remotion/src/SmartAggregationProblems.tsx` — exports: TitleSlide, NaiveListenerSlide, FanoutExplosionSlide
- `remotion/src/SmartAggregationSolution.tsx` — exports: SolutionIntroSlide, TwoPhasePipelineSlide
- `remotion/src/SmartAggregationExample.tsx` — exports: NaiveExplosionSlide, AggregatedDeletionSlide
- `remotion/src/SmartAggregationMechanics.tsx` — exports: SkipLockedSlide, IdempotencySlide
- `remotion/src/components/Nodes.tsx` — GRADIENTS.bg for root wrapper
</read_first>

## Tasks

### Task 1 — Create SmartAggregation.tsx

<action>
Create `remotion/src/SmartAggregation.tsx` — the root composition.

Import all exported slides from Plans 1.1–1.4 and sequence them as follows:

```
Sequence layout (all at 30fps):

from=0,        duration=90   → TitleSlide              (3s)
from=90,       duration=360  → NaiveListenerSlide       (12s)
from=450,      duration=360  → FanoutExplosionSlide     (12s)
from=810,      duration=270  → SolutionIntroSlide       (9s)
from=1080,     duration=600  → TwoPhasePipelineSlide    (20s)
from=1680,     duration=480  → NaiveExplosionSlide      (16s)
from=2160,     duration=600  → AggregatedDeletionSlide  (20s)
from=2760,     duration=420  → SkipLockedSlide          (14s)
from=3180,     duration=480  → IdempotencySlide         (16s)
```

Total: 3660 frames = 122 seconds

Root wrapper:
```tsx
export const SmartAggregation: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: GRADIENTS.bg }}>
      <Sequence from={0}            durationInFrames={fps * 3}   > <TitleSlide /> </Sequence>
      <Sequence from={fps * 3}      durationInFrames={fps * 12}  > <NaiveListenerSlide /> </Sequence>
      <Sequence from={fps * 15}     durationInFrames={fps * 12}  > <FanoutExplosionSlide /> </Sequence>
      <Sequence from={fps * 27}     durationInFrames={fps * 9}   > <SolutionIntroSlide /> </Sequence>
      <Sequence from={fps * 36}     durationInFrames={fps * 20}  > <TwoPhasePipelineSlide /> </Sequence>
      <Sequence from={fps * 56}     durationInFrames={fps * 16}  > <NaiveExplosionSlide /> </Sequence>
      <Sequence from={fps * 72}     durationInFrames={fps * 20}  > <AggregatedDeletionSlide /> </Sequence>
      <Sequence from={fps * 92}     durationInFrames={fps * 14}  > <SkipLockedSlide /> </Sequence>
      <Sequence from={fps * 106}                                 > <IdempotencySlide /> </Sequence>
    </AbsoluteFill>
  );
};
```

Use `useVideoConfig` to get fps. Import GRADIENTS from `./components/Nodes`.
Total durationInFrames = fps * 122 = 3660 (at 30fps).
</action>

<acceptance_criteria>
- `SmartAggregation.tsx` exists in `remotion/src/`
- All 9 imports from the 4 sub-files are present
- Sequences cover the full timeline without gaps or overlaps
- `export const SmartAggregation` is the named export
- No TypeScript errors
</acceptance_criteria>

---

### Task 2 — Register in Root.tsx

<action>
Add `SmartAggregation` to `remotion/src/Root.tsx`.

Import at top of file (after existing imports):
```tsx
import { SmartAggregation } from './SmartAggregation';
```

Add inside `RemotionRoot` after the existing `ConcurrencyControl` composition:
```tsx
<Composition
  id="SmartAggregation"
  component={SmartAggregation}
  durationInFrames={3660}
  fps={30}
  width={1280}
  height={720}
/>
```
</action>

<acceptance_criteria>
- `Root.tsx` contains `import { SmartAggregation } from './SmartAggregation'`
- `Root.tsx` contains `<Composition id="SmartAggregation" ... durationInFrames={3660} fps={30} width={1280} height={720} />`
- No TypeScript errors
- `SmartAggregation` appears in Remotion Studio's composition list when running `bun run dev`
</acceptance_criteria>

---

### Task 3 — TypeScript Validation

<action>
Run TypeScript type-check to verify all 5 new files compile cleanly:

```bash
cd remotion && npx tsc --noEmit
```

Fix any type errors before considering the plan done. Common issues to check:
- Missing `React` import (all new files need `import React from 'react'`)
- Missing `useCurrentFrame`, `useVideoConfig` imports from `'remotion'`
- Arrow SVG elements needing correct `strokeDasharray` string type (use string, not number)
- `spring()` frame argument: `frame - delay` can be negative — spring handles this fine (clamps at 0)
</action>

<acceptance_criteria>
- `npx tsc --noEmit` exits with code 0 in the `remotion/` directory
- No errors about missing exports, incorrect types, or unknown properties
</acceptance_criteria>

---

## Verification

<must_haves>
- [ ] `SmartAggregation.tsx` created and sequences all 9 slides
- [ ] `Root.tsx` updated — `SmartAggregation` composition registered
- [ ] `durationInFrames={3660}` matches `fps * 122`
- [ ] `npx tsc --noEmit` in `remotion/` passes with exit code 0
- [ ] Running `bun run dev` in `remotion/` starts Remotion Studio and `SmartAggregation` appears in the composition list
- [ ] All SMART-01 through SMART-12 requirements are covered by the sequenced slides:
  - SMART-01: TitleSlide ✓
  - SMART-02,03,04: NaiveListenerSlide + FanoutExplosionSlide ✓
  - SMART-05,06,07,08: SolutionIntroSlide + TwoPhasePipelineSlide ✓
  - SMART-10: NaiveExplosionSlide + AggregatedDeletionSlide ✓
  - SMART-09,11,12: SkipLockedSlide + IdempotencySlide ✓
</must_haves>
