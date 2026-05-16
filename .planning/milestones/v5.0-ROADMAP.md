# Roadmap — Milestone v5.0 (Revamp Autopilot)

## Phase 21: Legacy Engine Teardown
**Goal**: Tear down the existing internal Autopilot engine while stubbing API mutations to prevent UI breakage.
**Requirements**: [AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05]

**Success Criteria**:
1. `ConditionEvaluator`, `ActionHandlers`, `AutopilotDispatcher`, and `AutopilotEngine` files are safely deleted.
2. GraphQL API boundary remains intact.
3. Mutations are stubbed to return safe empty data instead of executing legacy logic.
4. System compiles and runs without the old engine code.
