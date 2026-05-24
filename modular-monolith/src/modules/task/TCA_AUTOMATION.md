# Task TCA Automation Engine

This document explains the task module's Trigger-Condition-Action automation
system. It is written for engineers and AI agents that need to extend, debug, or
review the feature without re-discovering the architecture from scratch.

## Quick Map

The system lets a project define flat automation rules:

```text
WHEN trigger happens
IF condition is true
THEN run action
```

Examples:

```text
WHEN task status changes
IF task has incomplete descendants
THEN reject the transition ("Finish subtasks first.")
```

```text
WHEN a descendant status changes
IF all descendants are in status DONE
THEN set the parent task status to READY
```

Core files:

| Area | File |
| --- | --- |
| Public service types | `TaskService.ts` |
| Service implementation | `internal/TaskServiceImpl.ts` |
| Trigger / condition / action registry | `internal/AutomationRegistry.ts` |
| Async event listener | `internal/listeners/TaskAutomationListener.ts` |
| Database table type | `../../infra/database/tables/TaskAutomationRule.ts` |
| GraphQL schema | `../../infra/graphql/schema/task/task-automation.graphql` |
| GraphQL resolver (catalog + CRUD) | `../../infra/graphql/resolvers/task-automation.ts` |
| Tests | `internal/__tests__/TaskAutomation.test.ts` |

Frontend files:

| Area | File |
| --- | --- |
| API contract | `../../../../ui-v1/src/api/interfaces/AutomationAPI.ts` |
| GraphQL adapter | `../../../../ui-v1/src/api/adapters/graphql/GraphQLAutomationAPI.ts` |
| Dynamic field renderer | `../../../../ui-v1/src/components/Project/AutomationFormRenderer.tsx` |
| Dashboard + wizard | `../../../../ui-v1/src/components/Project/AutomationDashboard.tsx` |

---

## Data Model

Rules live in `task_automation_rule`.

```sql
task_automation_rule (
    id UUID PRIMARY KEY,
    fk_project_id UUID NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_sync BOOLEAN NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_value TEXT,
    condition_type TEXT NOT NULL,
    condition_value TEXT,
    action_type TEXT NOT NULL,
    action_value TEXT,
    version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
)
```

The schema is deliberately flat. There is no AST, no JSON interpreter, and no
user-supplied code. String enum keys select server-owned TypeScript callbacks in
`AutomationRegistry.ts`.

Important columns:

- `fk_project_id` — Rule scope. Rules never cross projects.
- `is_active` — Soft on/off switch controlled by the dashboard.
- `is_sync` — `true` means pre-commit guard, `false` means async cascade.
- `trigger_type` / `trigger_value` — Defines the "when".
- `condition_type` / `condition_value` — Defines the "if".
- `action_type` / `action_value` — Defines the "then".
- `version` — Optimistic lock for update mutations.

---

## Supported Registry

### Triggers

| Key | Fires on | Sync? | Async? |
| --- | --- | --- | --- |
| `STATUS_CHANGED` | The task whose status changed | ✅ | ✅ |
| `DESCENDANT_STATUS_CHANGED` | Every ancestor task when any descendant's status changes | ❌ | ✅ |

**STATUS_CHANGED** `trigger_value` is optional JSON:
```json
{ "from": "TODO", "to": "IN_PROGRESS" }
```
Omit `from` or `to` to match any value for that field. Omit entirely to match
any status change.

**DESCENDANT_STATUS_CHANGED** has no trigger value. It automatically fires on any status change of a descendant, leaving specific status validation to the condition step. The rule's condition and action execute in the context of the **ancestor** task.

### Conditions

| Key | True when | Compatible with |
| --- | --- | --- |
| `STATUS_EQUALS` | Task's current status equals value | `STATUS_CHANGED` |
| `ASSIGNEE_EQUALS` | Task's assignee matches value (`none` = unassigned) | `STATUS_CHANGED` |
| `ALL_DESCENDANTS_IN_STATUS` | Every descendant is in the supplied status | `DESCENDANT_STATUS_CHANGED` |
| `HAS_INCOMPLETE_DESCENDANTS` | At least one descendant is NOT in the supplied status | `STATUS_CHANGED` |

> `HAS_INCOMPLETE_DESCENDANTS` is the logical inverse of `ALL_DESCENDANTS_IN_STATUS`.
> Both share the same SQL query on `task_reachability`. Zero duplication.

### Actions

| Key | What it does | Sync? | Async? |
| --- | --- | --- | --- |
| `SET_STATUS` | Transitions the task to a specific status | ✅ | ✅ |
| `SET_ASSIGNEE` | Assigns to a member / actor / unassigns | ✅ | ✅ |
| `REJECT_TRANSITION` | Throws `ValidationError`, blocking the transition | ✅ only | ❌ |

---

## Compatibility Map

The resolver (`task-automation.ts`) defines a `TRIGGER_COMPATIBILITY` constant:

```ts
const TRIGGER_COMPATIBILITY = {
  STATUS_CHANGED: {
    conditions: ['STATUS_EQUALS', 'ASSIGNEE_EQUALS', 'HAS_INCOMPLETE_DESCENDANTS'],
    actions: ['SET_STATUS', 'SET_ASSIGNEE', 'REJECT_TRANSITION'],
  },
  DESCENDANT_STATUS_CHANGED: {
    conditions: ['ALL_DESCENDANTS_IN_STATUS'],
    actions: ['SET_STATUS', 'SET_ASSIGNEE'],
    // REJECT_TRANSITION excluded: the descendant's transition already committed
  },
};
```

Each `TriggerTemplate` in the catalog response carries `compatibleConditions`
and `compatibleActions` arrays derived from this map. The frontend wizard uses
these to filter Step 2 and Step 3 — **no frontend hardcoding required**.

When the user changes the trigger:
- Incompatible condition/action selections are automatically reset.
- If only one compatible option exists it is auto-selected and the wizard shows a hint.

---

## Execution Model

### Sync Path: Pre-Commit Guard

Used for validation rules that block a mutation before it commits.

```
GraphQL task.update
→ TaskServiceImpl.updateTask
→ runSyncAutomationRules
→ load active sync STATUS_CHANGED rules
→ evaluate transition match (trigger_value JSON)
→ evaluate condition against current task state
→ run action (may throw ValidationError → rejects the update)
→ only then call TaskQueries.updateTask
```

- Runs **before** the database write.
- Only runs when `param.status` is present and actually changes.
- `DESCENDANT_STATUS_CHANGED` is **not** supported in sync mode — descendant
  changes are always async because they happen post-commit.

### Async Path: Post-Commit Cascade

Used for background automation cascades after events are committed.

```
TaskService.updateTask commits task.updated outbox event
→ OutboxRelay publishes task.updated on task-events
→ TaskAutomationListener.handleTaskUpdated
    ├─ runStatusChangedRules     (fires on the changed task)
    └─ runDescendantStatusChangedRules
          ├─ query task_reachability for all ancestors
          └─ for each ancestor: evaluate rules in ancestor context
```

**Why ancestor context matters:** For `DESCENDANT_STATUS_CHANGED`, the
condition (`ALL_DESCENDANTS_IN_STATUS`) checks whether all of the *ancestor's*
descendants are done. The action (`SET_STATUS`) updates the *ancestor* task.
The descendant that triggered the event is irrelevant to the action target.

**Self-propagating cascades:** Because async actions call `taskService.updateTask`,
they emit new `task.updated` events. This naturally chains cascades without any
graph traversal logic — each step triggers the next through normal event flow.

---

## Graph Reachability

Both `ALL_DESCENDANTS_IN_STATUS` and `HAS_INCOMPLETE_DESCENDANTS` query the
pre-computed `task_reachability` closure table:

```sql
-- Is there any descendant NOT in the target status?
SELECT descendant_task_id
FROM task_reachability
INNER JOIN project_task ON project_task.id = task_reachability.descendant_task_id
WHERE ancestor_task_id = $taskId
  AND depth > 0
  AND project_task.status != $targetStatus
LIMIT 1
```

`LIMIT 1` is used because only existence matters — no need for `COUNT(*)`.

The `DESCENDANT_STATUS_CHANGED` listener also queries `task_reachability` to
walk up from changed task → ancestors:

```sql
SELECT ancestor_task_id
FROM task_reachability
WHERE descendant_task_id = $changedTaskId
  AND depth > 0
```

---

## GraphQL API

Schema lives in `task-automation.graphql`.

Queries:

```graphql
automationTemplatesCatalog(projectId: ID!): AutomationTemplatesCatalog!
taskAutomationRules(projectId: ID!): [TaskAutomationRule!]!
```

Mutations:

```graphql
createTaskAutomationRule(input: CreateTaskAutomationRuleInput!): TaskAutomationRule!
updateTaskAutomationRule(input: UpdateTaskAutomationRuleInput!): TaskAutomationRule!
deleteTaskAutomationRule(projectId: ID!, ruleId: ID!): DeleteAutomationRuleResult!
```

The `TriggerTemplate` type now includes:

```graphql
compatibleConditions: [String!]!
compatibleActions: [String!]!
```

These are populated from `TRIGGER_COMPATIBILITY` in the resolver and consumed
by the frontend wizard to filter steps without any frontend-side hardcoding.

---

## Frontend Wizard

The rule builder is a 4-step wizard inside a compact modal:

| Step | Content |
| --- | --- |
| 1 — Basics | Rule name + sync/async mode |
| 2 — Trigger | Pick trigger + configure its value |
| 3 — Condition | Filtered to compatible conditions only |
| 4 — Action | Filtered to compatible actions only |

Filtering behavior:
- `filteredConditions` = `catalog.conditions` filtered by `triggerTemplate.compatibleConditions`
- `filteredActions` = `catalog.actions` filtered by `triggerTemplate.compatibleActions`
- When trigger changes: incompatible selections reset; single-option lists auto-select
- A "pre-selected" hint shows when only one compatible option exists

---

## Adding A New Trigger

1. Add the string key to `AUTOMATION_TRIGGERS` in `AutomationRegistry.ts`.
2. Add an entry in `TRIGGER_COMPATIBILITY` in `task-automation.ts` with its
   `conditions` and `actions` lists.
3. Add its template object to the `triggers` array in the catalog resolver.
4. Implement execution:
   - Sync: extend `TaskServiceImpl.runSyncAutomationRules`.
   - Async: add a `run<Name>Rules` method to `TaskAutomationListener` and call
     it from `handleTaskUpdated` (or a new event handler).
5. Update tests and this doc.

## Adding A New Condition

1. Add the key to `AUTOMATION_CONDITION_TYPES`.
2. Implement callback in `AUTOMATION_CONDITIONS`:
   ```ts
   (task: Task, value: string | null) => Promise<boolean>
   ```
3. Add template metadata to the `conditions` array in the catalog resolver.
4. Add the key to any `TRIGGER_COMPATIBILITY` entries where it is valid.
5. Add tests for true and false cases.

Rules:
- Conditions must be read-only and deterministic.
- Conditions may query the database.
- Return `false` for null/missing values unless vacuous truth applies.

## Adding A New Action

1. Add the key to `AUTOMATION_ACTION_TYPES`.
2. Implement callback in `AUTOMATION_ACTIONS`:
   ```ts
   (task: Task, value: string | null, ctx: AutomationActionContext) => Promise<void>
   ```
3. Add template metadata to the `actions` array in the catalog resolver.
4. Add the key to any `TRIGGER_COMPATIBILITY` entries where it is valid.
5. Add tests.

Rules:
- Mutating actions **must** call `ctx.taskService.updateTask` — never direct SQL.
- Sync-only actions must check `ctx.isSync` and no-op when false.
- Async actions should guard against no-op writes (check current value first).

---

## Validation and Safety

`TaskServiceImpl.validateAutomationRuleInput` checks:

- Required name on create.
- `isAutomationTrigger(triggerType)` — key is in the registry.
- `isAutomationConditionType(conditionType)` — key is in the registry.
- `isAutomationActionType(actionType)` — key is in the registry.
- Null booleans are rejected on update.

Access control via `ensureAutomationProjectAccess`: project owner, member, or
`system:*` actor.

---

## Tests

`TaskAutomation.test.ts` covers:

- Sync rejection: STATUS_CHANGED + HAS_INCOMPLETE_DESCENDANTS + REJECT_TRANSITION.
- Async status cascade: STATUS_CHANGED + STATUS_EQUALS + SET_STATUS.

Run tests:

```bash
cd modular-monolith
bun run check-types
DB_PORT=5435 bun run test
```

Run full verification:

```bash
cd modular-monolith
bun run check-types
DB_PORT=5435 bun run test
bun run test:e2e:open
bun run test:e2e:run
bun run test:e2e:close

cd ../ui-v1
bun x tsc --noEmit
npm run build
```

---

## Common Debugging Checklist

**Rule does not appear in dashboard:**
- Check `taskAutomationRules(projectId)` response.
- Check user has project access.
- Check the rule row has correct `fk_project_id`.

**Wizard shows wrong conditions/actions:**
- Check `automationTemplatesCatalog(projectId).triggers[n].compatibleConditions/compatibleActions`.
- Check `TRIGGER_COMPATIBILITY` in `task-automation.ts`.

**Sync block does not happen:**
- Rule must be `is_sync = true`.
- `trigger_type` must be `STATUS_CHANGED` (only sync-capable trigger).
- Transition must match `trigger_value` JSON.
- Status must actually change to a new value.
- Condition must evaluate to true.

**Async cascade does not happen:**
- Rule must be `is_sync = false` and `is_active = true`.
- `TaskAutomationListener` must be registered in the Kafka registry.
- For `DESCENDANT_STATUS_CHANGED`: check `task_reachability` has rows linking
  the changed task to its ancestors (verify the reachability sync listener ran).

**Parent task not promoted:**
- Confirm task_reachability has the correct ancestor ↔ descendant rows.
- Confirm ALL descendants (not just direct children) are in the target status.
- Check the async listener logs for the `DESCENDANT_STATUS_CHANGED` run.

---

## Design Constraints

Keep these unless the architecture is intentionally revised:

- No user-authored code execution.
- No expression tree interpreter or nested JSON rule graphs.
- No direct SQL mutation from actions when `taskService` can perform it.
- Keep registry keys finite and reviewable.
- Keep the compatibility map (`TRIGGER_COMPATIBILITY`) as the single source of
  truth — update it when adding triggers, conditions, or actions.
- Keep sync guards fast enough for request-response latency.
- Keep async listeners idempotent enough to tolerate event replay.

## Current Gaps

- Status options come from common frontend defaults plus loaded task statuses,
  not a dedicated project status catalog.
- Async action retry on optimistic conflict is not implemented.
- No cross-project automation (by design — rules are scoped to one project).
