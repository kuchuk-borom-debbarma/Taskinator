# Phase 02: Live-Context Retrieval Engine - Plan

**Goal:** Build the mechanism to fetch "fresh" domain state from the DB for condition evaluation.

## Proposed Changes

### Autopilot Module (Internal)
#### [NEW] [ContextService.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/ContextService.ts)
- Implement `ContextService` with a registry for `DomainContextResolver`s.
- Implement `buildContext(domain, id, eventPayload)` logic:
  - Fetch from resolver.
  - Flatten keys to `domain:field`.
  - Merge event payload for change detection.

#### [NEW] [TaskContextResolver.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/TaskContextResolver.ts)
- Implement `DomainContextResolver` using `TaskService.getTasksByIds`.

#### [NEW] [ProjectContextResolver.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/ProjectContextResolver.ts)
- Implement `DomainContextResolver` using `ProjectService.getProjectsByIds`.

### Bootstrap / Glue
#### [MODIFY] [AutopilotModule.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/index.ts)
- Initialize `ContextService` and register `TaskContextResolver` and `ProjectContextResolver`.

## Task List

- [ ] Define `DomainContextResolver` interface
- [ ] Implement `ContextService.ts` base logic
- [ ] Implement `TaskContextResolver.ts`
- [ ] Implement `ProjectContextResolver.ts`
- [ ] Hook up resolvers in `AutopilotModule.ts`
- [ ] Create unit tests for `ContextService` (Flattening & Merging)
- [ ] Create integration test for `TaskContextResolver` (DB Fetch)

## Verification Plan

### Automated Tests
- `npm test src/modules/autopilot/internal/ContextService.test.ts`
- `npm test src/modules/autopilot/internal/TaskContextResolver.integration.test.ts`

### Manual Verification
- Log the built context in a debug script and verify all `domain:field` keys are present.
