# Phase 16 Plan: Refactoring Scale

**Objective:** Refactor remaining visualization files (`AsyncProblems`, `TransactionalOutbox`, `UpgradedAsyncFlow`, and `ConcurrencyControl`) with clamped bezier easings, non-overlapping container isolate layers (`layout="none"`), and prune compiler-blocking unused variables to ensure 100% type safety.

---

## Proposed Workflow

### Wave 1: Async Problem & Evolution Slides
#### Plan 16-01: Refactor AsyncProblems.tsx and UpgradedAsyncFlow.tsx
- **Task 1.1**: Refactor `AsyncProblems.tsx` to clamp header, intro, and problem banner translations. Remove unused local variables `f` and `pulse` to pass TypeScript gates.
- **Task 1.2**: Refactor `UpgradedAsyncFlow.tsx` to introduce clamped translates to standard steps and node wrappers.
- **Verification**: Confirm local compile status of both files.

### Wave 2: Isolation & Flow Guards
#### Plan 16-02: Refactor TransactionalOutbox.tsx and ConcurrencyControl.tsx
- **Task 2.1**: Refactor `TransactionalOutbox.tsx` (Outbox pattern visualization) to secure scale transform matrices, color maps, and outbox status badge bounces.
- **Task 2.2**: Refactor `ConcurrencyControl.tsx` (Versioned task updates) to secure scale pulses and lock banner entries. Comment out unused variables `interpolateColors` and `angle`.
- **Verification**: Validate workspace with `npx tsc` guaranteeing zero compile errors in the 4 components.

---

## Dependencies
- Depends on: Phase 15 successfully established standards.

## Verification Plan
- Run `npx tsc` inside `remotion/` directory.
- **Success Criteria:** No compiler errors from the four target files: `AsyncProblems.tsx`, `UpgradedAsyncFlow.tsx`, `ConcurrencyControl.tsx`, and `TransactionalOutbox.tsx`.
