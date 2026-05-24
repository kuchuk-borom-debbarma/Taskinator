# Plan 05: Verification & Testing Plan

This plan details the testing strategies and validation commands to verify correctness, transaction safety, and regression isolation.

---

## 🧪 1. Automated Unit Tests

We will write direct TypeScript unit tests in the task module.

### Test Scenarios:
1. **Sync Transition Rejection**:
   * Setup: A task automation rule with trigger `TASK_STATUS_CHANGED` (value: `IN_PROGRESS`), condition `IS_BLOCKED`, action `REJECT_TRANSITION`.
   * Action: Create a blocked task. Attempt to transition status to `IN_PROGRESS` inside a transaction.
   * Expectation: Transaction throws `ValidationError`, rolls back cleanly, and database record status remains unchanged.
2. **Async Blocker Unlocking**:
   * Setup: A rule with trigger `PREREQUISITE_COMPLETED`, condition `ALL_PREREQUISITES_DONE`, action `SET_STATUS` (value: `READY`).
   * Action: Set up Task A blocking Task B. Complete Task A.
   * Expectation: The event listener runs, and Task B automatically transitions to `READY`. A fresh `task.updated` event is pushed to the outbox.

---

## 🚀 2. Integration & E2E Regression Verification

We will run the complete integration and E2E suites to confirm that adding this declarative TCA engine preserves zero-regression states for all standard operations.

### Verification Steps:

```bash
# 1. Backend Static Compilation Verification
bun run check-types

# 2. Run All Backend Unit & Integration Tests
bun run test

# 3. Spin Up E2E Docker Environment and Run complete E2E suite
bun run test:e2e

# 4. Frontend Static Compilation Verification
cd ui-v1 && bun x tsc --noEmit
```

### Success Metrics:
* **0 compilation errors** in backend and frontend.
* **All 45+ unit/integration tests** pass successfully.
* **All 152 E2E tests** pass cleanly inside the docker-compose environment.
