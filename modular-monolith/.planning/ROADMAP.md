# Roadmap: CWB Implementation

## Phase 1: Database & Schema Evolution
**Plans:** 1 plan

- [x] 01-01-PLAN.md — Create behavior_rule table and wipe legacy auto_action data.

## Phase 2: Pre-Action Guards (Preventive)
**Plans:** 1 plan

- [x] 02-01-PLAN.md — Implement guard hook pipeline, logic for PARENT_DELETE_GUARD, BLOCKER_SAFETY_GUARD, and MEMBER_ASSIGNMENT_GUARD.

## Phase 3: Post-Action Cascades (Reactive)
**Plans:** 2 plans

- [x] 03-01-PLAN.md — Implement CascadeService.
- [x] 03-02-PLAN.md — Refactor AutoActionTaskEventConsumer and verify.

## Phase 4: UI Metadata & Cleanup
**Plans:** 2 plans

- [x] 04-01-PLAN.md — Implement behavior settings catalog and cleanup legacy executors.
- [x] 04-02-PLAN.md — Expose behavior catalog via GraphQL.

## Phase 5: Verification & Hardening
**Plans:** 1 plan

- [ ] 05-01-PLAN.md — Standardize labels, implement E2E integration tests, and profile graph performance.
