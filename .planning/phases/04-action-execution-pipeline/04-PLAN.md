# Phase 04: Action Execution Pipeline - Plan

**Goal:** Implement the framework and core handlers for executing sequential actions.

## Proposed Changes

### Database
#### [NEW] [AutopilotAction.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/database/tables/AutopilotAction.ts)
- Define `AutopilotActionTable` interface.
- Columns: `id`, `fk_autopilot_id`, `type`, `config` (JSONB), `position`.

#### [MODIFY] [database/index.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/database/index.ts)
- Register `autopilot_action` table in `Database` interface.

### Autopilot Module (Internal)
#### [NEW] [ActionRunner.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/ActionRunner.ts)
- Implement `ActionRunner` class.
- Method `run(autopilotId, targetEntityId, traceId)`:
  - Fetch actions from `autopilot_action` where `fk_autopilot_id = autopilotId` order by `position`.
  - For each action:
    - Look up handler by `type`.
    - Execute handler with `config` and `targetEntityId`.
    - Log result with `traceId`.
    - If failure: Stop chain.

#### [NEW] [ActionHandlers.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/ActionHandlers.ts)
- Registry of executable functions using `TaskService`.
- Handlers: `task.update_status`, `task.assign_team`, `task.assign_member`, `task.update_priority`.

### Integration
#### [MODIFY] [AutopilotEngine.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/AutopilotEngine.ts)
- Inject `ActionRunner`.
- Call `actionRunner.run(autopilot.id, entityId, traceId)` on condition match.

## Task List
- [ ] Create `AutopilotAction.ts` table definition
- [ ] Implement `ActionHandlers.ts` (mapping to `TaskService.updateTask`)
- [ ] Implement `ActionRunner.ts` logic
- [ ] Integrate `ActionRunner` into `AutopilotEngine`
- [ ] Create unit tests for `ActionRunner` (Check sequencing and stop-on-failure)
- [ ] Create integration test for a full "Trigger -> Condition -> Action" flow

## Verification Plan

### Automated Tests
- `npm test src/modules/autopilot/internal/ActionRunner.test.ts`
- `npm test src/modules/autopilot/internal/AutopilotE2E.test.ts`

### Manual Verification
- Manually update a task to trigger an autopilot that changes its own status and verify the status update in the DB.
