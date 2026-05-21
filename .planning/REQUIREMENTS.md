# Requirements Specifications - Milestone v12.0 (Tied Rule Orchestration)

## 1. Type-Safe Sequential Flow Schema

We need type-safe representations of execution flows that users can configure.

### Requirements:
* **REQ-01**: Implement `auto-action-engine/types.ts` defining flow steps:
  * `ActionStep`: `{ type: 'action', actionId: string, inputs: any }`
  * `ConditionActionStep`: `{ type: 'condition_action', condition: ConditionNode, actionId: string, inputs: any }`
* **REQ-02**: Define a combined Zod schema `pipelineStepSchema` validating these two step types.
* **REQ-03**: Define `autoActionFlowSchema` as an array of `PipelineStep` representing the execution chain.

---

## 2. DB Schema & CRUD Manager with Constraints

We will manage persistent storage of auto-actions using the Kysely database layer.

### Requirements:
* **REQ-04**: Map the `AutoAction` entity to the underlying `autopilot` Kysely table structure.
* **REQ-05**: Implement project-scoped unique name validation:
  * Creating or updating an auto-action must fail if an active auto-action with the same name already exists in the same project (`fk_project_id`).
* **REQ-06**: Implement CRUD operations in a database manager (`manager.ts`):
  * Expose `createAutoAction`, `updateAutoAction`, `deleteAutoAction`, and `getAutoActionsForProject`.

---

## 3. Sync/Async Boundaries & Dynamic Template Catalog

We need to differentiate between synchronous and asynchronous rules and validate their boundaries.

### Requirements:
* **REQ-07**: Define `is_sync` boolean property in `AutoAction` representation.
* **REQ-08**: Validate execution flows to ensure a synchronous flow contains zero asynchronous actions (`isAsync: true`) or asynchronous conditions.
* **REQ-09**: Update `getTemplateForScope(scope, isSync)` in `template.ts` to dynamically filter actions and condition types:
  * If `isSync === true`, return only definitions where `isAsync === false`.
  * If `isSync === false` or omitted, return all catalog entries.

---

## 4. Sequential Flow Executor

The executor is responsible for taking a snapshot and running the sequence step-by-step.

### Requirements:
* **REQ-10**: Implement `executeAutoAction(autoActionId: string, contextSnapshot: any)` in `executor.ts`:
  * Sequential step execution: Runs step `A`, then `B`, then `C`.
  * For each step:
    * Fetch fresh context via `fetchContext()` (from `contextEngine.ts`).
    * If `ActionStep`: execute the action via `executeAction()` (from `actionEngine.ts`).
    * If `ConditionActionStep`: evaluate the condition via `evaluateCondition()`. If `true`, execute the associated action via `executeAction()`.

---

## 5. Comprehensive Testing

* **REQ-11**: Implement unit and integration tests in `__tests__/autoActionEngine.test.ts` verifying:
  * Successful sequential flow execution.
  * Correct condition-action evaluation paths (condition evaluates true vs false).
  * Strict boundary validation rejecting async steps in sync flows.
  * Project-scoped unique name constraint enforcement.
  * Dynamic template filtering for sync/async scopes.
