# Phase 16: Refactoring Scale - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Source:** Core Assumptions & Precedents

<domain>
## Phase Boundary
Refactor the scale-related visualization components to resolve layout shifts, timeline bleed, and animation stability at 60 FPS:
1. **REFACTOR-04**: `AsyncProblems` (Dual-Write & Lost Event)
2. **REFACTOR-05**: `TransactionalOutbox` and `UpgradedAsyncFlow`
3. **REFACTOR-06**: `ConcurrencyControl`
</domain>

<decisions>
## Implementation Decisions

### Remotion Architecture Stabilisation
Based on Phase 15 successful gates, ALL refactored files in this phase MUST apply:
- **Safety Clamping**: Always inject `{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) }` on numeric visual translations.
- **Sequence Containment**: Use `<Sequence layout="none">` boundaries for absolute coordinate isolations.
- **Zero-Warning Types**: Ensure NO `noUnusedLocals` or `noUnusedParameters` warnings are committed.

### API Version Contraints
- **NO `premountFor`**: The prop is unsupported in local Remotion `4.0.456` and MUST NOT be used in sequences.
</decisions>

<canonical_refs>
## Canonical References
- [ROADMAP.md](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/.planning/ROADMAP.md)
- Phase 15 [walkthrough.md](file:///Users/kuchukboromdebbarma/.gemini/antigravity/brain/c28bf8e8-81ef-4d34-aa91-f9031db1cfa5/walkthrough.md)
</canonical_refs>
