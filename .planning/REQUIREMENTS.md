# Requirements Specifications - Milestone v10.0 (Action & Condition Engine Isolation)

## 1. Clean Separation & Removal of Tied Orchestrator

The main goal is to break the coupled trigger-to-condition-to-action pipeline inside the `auto-action` module and remove any orchestration logic.

### Requirements:
* **REQ-01**: Remove/Delete `src/modules/auto-action/evaluator.ts` completely.
* **REQ-02**: Remove/Delete the combined triggers, conditions, and actions registry inside `src/modules/auto-action/registry.ts`.
* **REQ-03**: Clean up the root `src/modules/auto-action/index.ts` to no longer export combined registries or run tied pipelines.
* **REQ-04**: Eliminate triggers from registration entirely, as triggers represent the "tied flow" entrypoint which is out of scope for this milestone.

---

## 2. Independent Condition Engine (`conditionEngine`)

We will introduce a completely isolated, standalone `conditionEngine` component inside the `auto-action` module.

### Requirements:
* **REQ-05**: Implement `src/modules/auto-action/conditionEngine.ts` exposing:
  * An isolated `ConditionRegistry` class or namespace to register and retrieve `ConditionDefinition` objects.
  * An independent `evaluateCondition(node: ConditionNode, ctx: any): boolean` evaluator.
  * The evaluator must perform pure recursive AST evaluation (AND, OR, NOT) and delegate to registered `ConditionDefinition` leaf checks.
* **REQ-06**: Ensure task conditions (`scopes/task/conditions/`) are registered exclusively into the isolated `ConditionRegistry`.

---

## 3. Independent Action Engine (`actionEngine`)

We will introduce a completely isolated, standalone `actionEngine` component inside the `auto-action` module.

### Requirements:
* **REQ-07**: Implement `src/modules/auto-action/actionEngine.ts` exposing:
  * An isolated `ActionRegistry` class or namespace to register and retrieve `ActionDefinition` objects.
  * An independent action execution mechanism that handles input Zod validation and triggers action handlers.
* **REQ-08**: Ensure task actions (`scopes/task/actions/`) are registered exclusively into the isolated `ActionRegistry`.
* **REQ-09**: Action executors must still enforce strict fresh-fetching and optimistic concurrency safety guarantees when modifying database entities, fully isolated from trigger loops.

---

## 4. Testing & Verification

* **REQ-10**: Rewrite the test suite `src/modules/auto-action/__tests__/autoAction.test.ts` to verify:
  * Independent condition registry and AST evaluation in `conditionEngine`.
  * Independent action registry and setFields optimistic database updates in `actionEngine`.
  * No triggers or tied orchestration are evaluated or registered.
