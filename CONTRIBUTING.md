# Contributing to Taskinator-v2

Welcome to the **Taskinator-v2** development tree! To maintain our 10k+ RPS performance metrics and cinema-grade video stability, all code modifications must strictly adhere to our quality protocols.

---

## 🎨 Frontend & Visual Engineering (`remotion/`)

The video visualization engine uses **Remotion** to build frame-accurate layouts.

### 1. The "No CSS Transition" Mandate
🚨 **CSS keyframes, browser animations, and Tailwind `transition-*` are STRICTLY PROHIBITED.**
Browser layout runtimes are non-deterministic across headless clouds. You **must** use Stateless Remotion Hooks:
- Use `spring()` or `interpolate()` tied to `useCurrentFrame()`.
- Always apply robust **clamping** to your offsets (`frame - START_OFFSET`) to prevent unstable visual bouncing or negative progression bugs.

### 2. Orchestration Registry
Any new visualization composition must be:
- Programmed in an isolated React Component.
- Formally registered inside `src/Root.tsx` with an absolute frame duration.
- Integrated into `src/MasterPresentation.tsx` sequentially to automatically lock in 15-frame overlapping crossfades.

### 3. Strict Typing
Run static compilation verification locally before attempting commits:
```bash
bun install
npx tsc
```

---

## 🏗️ Core Engineering (`modular-monolith/`)

For backend developers working on the core engine:
- **Atomicity First:** Leverage Transactional Outbox patterns and Write-ahead Common Table Expressions (wCTEs) for all persistent mutations.
- **No Infinite Loops:** Utilize the built-in `TraceID` context with depth-blocking (max-depth `50` for closure hierarchies) to safeguard graph mutations.
- **Optimistic Safety:** Enforce deterministic pagination and ID tie-breakers across high-concurrency streams.

---

## 📜 Commit Hygiene

Follow standard conventional commit tags:
- `feat(scope): ...` for functional features or new video scenes.
- `chore(scope): ...` for maintenance or cleanups.
- `docs(scope): ...` for documentation updates.
- `refactor(scope): ...` for Remotion conversions or logic decoupling.

*Thank you for keeping Taskinator-v2 safe, performant, and visually spectacular!*
