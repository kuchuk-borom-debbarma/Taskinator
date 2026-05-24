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
| `LINKED_INCOMING_STATUS_CHANGED` | A task when any incoming linked task changes status (e.g. parent task when subtask changes) | ❌ | ✅ |
| `LINKED_OUTGOING_STATUS_CHANGED` | A task when any outgoing linked task changes status (e.g. subtask task when parent changes) | ❌ | ✅ |
| `PRIORITY_CHANGED` | The task whose priority changed | ✅ | ✅ |
| `ASSIGNEE_CHANGED` | The task whose assignee or team changed | ✅ | ✅ |
| `TASK_CREATED` | A newly created task in the project | ❌ | ✅ |

**Trigger Configuration Values (`trigger_value`):**
- **STATUS_CHANGED**: Optional JSON to match a specific transition:
  ```json
  { "from": "TODO", "to": "IN_PROGRESS" }
  ```
  Omit `from` or `to` to match any value for that field. Omit entirely or pass null to match any status change.
- **LINKED_INCOMING_STATUS_CHANGED** and **LINKED_OUTGOING_STATUS_CHANGED**: The plain string label of the link dependency to match (e.g. `blocks`, `subtask_of`).
- **PRIORITY_CHANGED**: Optional JSON to match a priority transition:
  ```json
  { "from": 2, "to": 4 }
  ```
  Or a plain number string (e.g. `4`) representing the target priority (legacy fallback). If omitted, matches any priority change.
- **DESCENDANT_STATUS_CHANGED**, **ASSIGNEE_CHANGED**, and **TASK_CREATED**: None (ignored/empty).

### Conditions

| Key | True when | Compatible with |
| --- | --- | --- |
| `STATUS_EQUALS` | Task's current status equals value | `STATUS_CHANGED`, `LINKED_INCOMING_STATUS_CHANGED`, `LINKED_OUTGOING_STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `TASK_CREATED` |
| `ASSIGNEE_EQUALS` | Task's assignee matches value (`none` = unassigned) | `STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `TASK_CREATED` |
| `ALL_DESCENDANTS_IN_STATUS` | Every descendant is in the supplied status | `DESCENDANT_STATUS_CHANGED` |
| `HAS_INCOMPLETE_DESCENDANTS` | At least one descendant is NOT in the supplied status | `STATUS_CHANGED` |
| `ALL_LINKED_INCOMING_IN_STATUS` | All tasks linking to this task with label L are in status S | `LINKED_INCOMING_STATUS_CHANGED` |
| `ALL_LINKED_OUTGOING_IN_STATUS` | All tasks this task links to with label L are in status S | `LINKED_OUTGOING_STATUS_CHANGED` |
| `PRIORITY_COMPARISON` | Task's priority matches the comparison operator/value | `STATUS_CHANGED`, `DESCENDANT_STATUS_CHANGED`, `LINKED_INCOMING_STATUS_CHANGED`, `LINKED_OUTGOING_STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `TASK_CREATED` |
| `TEAM_EQUALS` | Task's assigned team matches value (`none` = unassigned) | `STATUS_CHANGED`, `DESCENDANT_STATUS_CHANGED`, `LINKED_INCOMING_STATUS_CHANGED`, `LINKED_OUTGOING_STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `TASK_CREATED` |
| `ASSIGNEE_NOT_IN_TEAM` | Individual assignee is NOT a member of the assigned team | `STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `TASK_CREATED` |
| `HAS_LINK_WITH_LABEL` | Task has a link with label L in direction D | `STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `TASK_CREATED` |

**Condition Configuration Values (`condition_value`):**
- **ALL_LINKED_INCOMING_IN_STATUS** and **ALL_LINKED_OUTGOING_IN_STATUS**: JSON string representing the dependency label and target status:
  ```json
  { "label": "blocks", "status": "DONE" }
  ```
- **PRIORITY_COMPARISON**: JSON string specifying the operator and value:
  ```json
  { "operator": "lt", "value": 3 }
  ```
  Valid operators are: `gt` (>), `lt` (<), `eq` (=), `gte` (>=), `lte` (<=).
- **HAS_LINK_WITH_LABEL**: JSON string specifying the link direction and label:
  ```json
  { "direction": "incoming", "label": "blocks" }
  ```
  Valid directions are: `incoming`, `outgoing`, `both`.
- **ASSIGNEE_NOT_IN_TEAM**: None.

### Actions

| Key | What it does | Sync? | Async? |
| --- | --- | --- | --- |
| `SET_STATUS` | Transitions the task to a specific status | ✅ | ✅ |
| `SET_ASSIGNEE` | Assigns to a member / actor / unassigns | ✅ | ✅ |
| `REJECT_TRANSITION` | Throws `ValidationError`, blocking the transition | ✅ only | ❌ |
| `SET_PRIORITY` | Sets the task priority to a numeric value | ✅ | ✅ |
| `SET_TEAM` | Assigns the task to a specific team | ✅ | ✅ |
| `SET_TEAM_AND_ASSIGNEE` | Assigns both team and member (resolving team automatically) | ✅ | ✅ |
| `AUTO_ASSIGN_CREATOR` | Assigns the task back to its original creator | ✅ | ✅ |

**Action Configuration Values (`action_value`):**
- **SET_PRIORITY**: A numeric value string (e.g. `3`).
- **SET_TEAM_AND_ASSIGNEE**: A member ID (or `actor` / `none`). When a member/actor is selected, the engine queries the `project_team_member` table to automatically resolve the corresponding team ID and assign it alongside the member to maintain team scoping consistency. Setting `none` clears both assignee and team.
- **AUTO_ASSIGN_CREATOR**: None (automatically assigns the creator field).

---

## Compatibility Map

The resolver (`task-automation.ts`) defines a `TRIGGER_COMPATIBILITY` constant:

```ts
const TRIGGER_COMPATIBILITY = {
  STATUS_CHANGED: {
    compatibleConditions: [
      'STATUS_EQUALS',
      'ASSIGNEE_EQUALS',
      'HAS_INCOMPLETE_DESCENDANTS',
      'PRIORITY_COMPARISON',
      'TEAM_EQUALS',
      'ASSIGNEE_NOT_IN_TEAM',
      'HAS_LINK_WITH_LABEL',
    ],
    compatibleActions: [
      'SET_STATUS',
      'SET_ASSIGNEE',
      'REJECT_TRANSITION',
      'SET_PRIORITY',
      'SET_TEAM',
      'SET_TEAM_AND_ASSIGNEE',
      'AUTO_ASSIGN_CREATOR',
    ],
  },

  DESCENDANT_STATUS_CHANGED: {
    compatibleConditions: [
      'ALL_DESCENDANTS_IN_STATUS',
      'PRIORITY_COMPARISON',
      'TEAM_EQUALS',
    ],
    compatibleActions: [
      'SET_STATUS',
      'SET_ASSIGNEE',
      'SET_PRIORITY',
      'SET_TEAM',
      'SET_TEAM_AND_ASSIGNEE',
      'AUTO_ASSIGN_CREATOR',
    ],
  },

  LINKED_INCOMING_STATUS_CHANGED: {
    compatibleConditions: [
      'ALL_LINKED_INCOMING_IN_STATUS',
      'STATUS_EQUALS',
      'PRIORITY_COMPARISON',
      'TEAM_EQUALS',
    ],
    compatibleActions: [
      'SET_STATUS',
      'SET_ASSIGNEE',
      'SET_PRIORITY',
      'SET_TEAM_AND_ASSIGNEE',
      'AUTO_ASSIGN_CREATOR',
    ],
  },

  LINKED_OUTGOING_STATUS_CHANGED: {
    compatibleConditions: [
      'ALL_LINKED_OUTGOING_IN_STATUS',
      'STATUS_EQUALS',
      'PRIORITY_COMPARISON',
      'TEAM_EQUALS',
    ],
    compatibleActions: [
      'SET_STATUS',
      'SET_ASSIGNEE',
      'SET_PRIORITY',
      'SET_TEAM_AND_ASSIGNEE',
      'AUTO_ASSIGN_CREATOR',
    ],
  },

  PRIORITY_CHANGED: {
    compatibleConditions: [
      'STATUS_EQUALS',
      'ASSIGNEE_EQUALS',
      'PRIORITY_COMPARISON',
      'TEAM_EQUALS',
      'ASSIGNEE_NOT_IN_TEAM',
      'HAS_LINK_WITH_LABEL',
    ],
    compatibleActions: [
      'SET_STATUS',
      'SET_ASSIGNEE',
      'REJECT_TRANSITION',
      'SET_PRIORITY',
      'SET_TEAM',
      'SET_TEAM_AND_ASSIGNEE',
      'AUTO_ASSIGN_CREATOR',
    ],
  },

  ASSIGNEE_CHANGED: {
    compatibleConditions: [
      'STATUS_EQUALS',
      'ASSIGNEE_EQUALS',
      'PRIORITY_COMPARISON',
      'TEAM_EQUALS',
      'ASSIGNEE_NOT_IN_TEAM',
      'HAS_LINK_WITH_LABEL',
    ],
    compatibleActions: [
      'SET_STATUS',
      'SET_ASSIGNEE',
      'REJECT_TRANSITION',
      'SET_PRIORITY',
      'SET_TEAM',
      'SET_TEAM_AND_ASSIGNEE',
      'AUTO_ASSIGN_CREATOR',
    ],
  },

  TASK_CREATED: {
    compatibleConditions: [
      'STATUS_EQUALS',
      'ASSIGNEE_EQUALS',
      'PRIORITY_COMPARISON',
      'TEAM_EQUALS',
      'ASSIGNEE_NOT_IN_TEAM',
      'HAS_LINK_WITH_LABEL',
    ],
    compatibleActions: [
      'SET_STATUS',
      'SET_ASSIGNEE',
      'SET_PRIORITY',
      'SET_TEAM',
      'SET_TEAM_AND_ASSIGNEE',
      'AUTO_ASSIGN_CREATOR',
    ],
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
→ check if status, priority, or assignee is changing
→ load active sync rules (STATUS_CHANGED, PRIORITY_CHANGED, ASSIGNEE_CHANGED)
→ evaluate transition match (trigger_value JSON/plain for status/priority)
→ build validationTask projection (merging incoming assignee/team updates)
→ evaluate condition against the validationTask projection
→ run action (may throw ValidationError → rejects the update)
→ only then call TaskQueries.updateTask
```

- Runs **before** the database write.
- Runs when `param.status`, `param.priority`, `param.memberId`, or `param.teamId` is updated and actually changes from the database state.
- Builds a `validationTask` projection merging incoming updates. This ensures validations (like `ASSIGNEE_NOT_IN_TEAM`) check the *target* state being set, not the old state.
- `DESCENDANT_STATUS_CHANGED`, dependency links, and creation triggers are **not** supported in sync mode — those are always async.

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

- **Sync status rejection**: `STATUS_CHANGED` trigger + `HAS_INCOMPLETE_DESCENDANTS` condition + `REJECT_TRANSITION` action.
- **Async status cascade**: `STATUS_CHANGED` trigger + `STATUS_EQUALS` condition + `SET_STATUS` action.
- **Async linked incoming cascade**: `LINKED_INCOMING_STATUS_CHANGED` trigger + `ALL_LINKED_INCOMING_IN_STATUS` condition + `SET_STATUS` action.
- **Async linked outgoing cascade**: `LINKED_OUTGOING_STATUS_CHANGED` trigger + `ALL_LINKED_OUTGOING_IN_STATUS` condition + `SET_STATUS` action.
- **Sync priority rejection**: `PRIORITY_CHANGED` trigger + `PRIORITY_COMPARISON` condition + `REJECT_TRANSITION` action.
- **Async creator auto-assignment**: `TASK_CREATED` trigger + `AUTO_ASSIGN_CREATOR` action.
- **Sync assignee rejection**: `ASSIGNEE_CHANGED` trigger + `ASSIGNEE_NOT_IN_TEAM` condition + `REJECT_TRANSITION` action.

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
- `trigger_type` must be one of the sync-capable triggers: `STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`.
- For `STATUS_CHANGED` and `PRIORITY_CHANGED`, transition must match `trigger_value` JSON (or plain value).
- Status, priority, or assignee must actually change to a new value.
- Condition must evaluate to true on the pre-commit `validationTask` projection (note: team and assignee updates are merged pre-commit so that validations check the target state, while status and priority are evaluated pre-transition).

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
