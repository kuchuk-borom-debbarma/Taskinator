# Roadmap: CWB Implementation

## Phase 1: Database & Schema Evolution
**Plans:** 1 plan

- [ ] 01-01-PLAN.md — Create behavior_rule table and wipe legacy auto_action data.

## Phase 2: Pre-Action Guards (Preventive)
- [ ] Implement guard hook pipeline in `TaskServiceImpl`.
- [ ] Add `PARENT_DELETE_GUARD` logic.
- [ ] Add `BLOCKER_SAFETY_GUARD` logic.
- [ ] Add `MEMBER_ASSIGNMENT_GUARD` logic.

## Phase 3: Post-Action Cascades (Reactive)
- [ ] Refactor `AutoActionTaskEventConsumer` to use CWB rules.
- [ ] Implement `matchesCriteria` helper.
- [ ] Implement `BLOCKER_RESOLUTION` cascade.
- [ ] Implement `PRIORITY_CASCADE` and `TEAM_CASCADE`.
- [ ] Implement `CASCADE_DELETE`.

## Phase 4: UI Metadata & Cleanup
- [ ] Implement `getBehaviorSettingsCatalog` in `AutoActionService`.
- [ ] Delete legacy AST files and unused executors.
- [ ] Expose new service via GraphQL (if applicable).

## Phase 5: Verification & Hardening
- [ ] Add E2E tests for all Guard scenarios.
- [ ] Add E2E tests for all Cascade scenarios.
- [ ] Performance profiling of Kysely relationship queries.
