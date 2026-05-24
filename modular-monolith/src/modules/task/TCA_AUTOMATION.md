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

Example:

```text
WHEN task status changes to IN_PROGRESS
IF task is blocked
THEN reject the transition with "Finish blockers first."
```

Core files:

| Area | File |
| --- | --- |
| Public service types | `TaskService.ts` |
| Service implementation | `internal/TaskServiceImpl.ts` |
| Trigger/condition/action registry | `internal/AutomationRegistry.ts` |
| Async event listener | `internal/listeners/TaskAutomationListener.ts` |
| Database table type | `../../infra/database/tables/TaskAutomationRule.ts` |
| GraphQL schema | `../../infra/graphql/schema/task/task-automation.graphql` |
| GraphQL resolver | `../../infra/graphql/resolvers/task-automation.ts` |
| Tests | `internal/__tests__/TaskAutomation.test.ts` |

Frontend files:

| Area | File |
| --- | --- |
| API contract | `../../../../ui-v1/src/api/interfaces/AutomationAPI.ts` |
| GraphQL adapter | `../../../../ui-v1/src/api/adapters/graphql/GraphQLAutomationAPI.ts` |
| Dynamic field renderer | `../../../../ui-v1/src/components/Project/AutomationFormRenderer.tsx` |
| Dashboard | `../../../../ui-v1/src/components/Project/AutomationDashboard.tsx` |

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

- `fk_project_id`: Rule scope. Rules never cross projects.
- `is_active`: Soft on/off switch used by the dashboard.
- `is_sync`: `true` means pre-commit guard, `false` means async cascade.
- `trigger_type` and `trigger_value`: Defines the "when".
- `condition_type` and `condition_value`: Defines the "if".
- `action_type` and `action_value`: Defines the "then".
- `version`: Optimistic lock for update mutations.

Migration files:

- `database/migration_automation_rule.sql`
- `database/schema.sql`

## Supported Registry

The registry is finite, strongly typed, and highly generalized.

Triggers:

- `STATUS_CHANGED`: Fires when a task changes status. Support optional `from` and/or `to` transitions by storing serialized JSON configurations (e.g. `{"from":"TODO","to":"IN_PROGRESS"}`) in the `trigger_value` column.

Conditions:

- `STATUS_EQUALS`: True when the task's current status equals the user-supplied string value.
- `ASSIGNEE_EQUALS`: True when the task's assignee matches the user-supplied string value (or is unassigned if `'none'`).

Actions:

- `SET_STATUS`: Automatically transitions the task to the selected status column.
- `SET_ASSIGNEE`: Assigns the task to the user-supplied value (assigns to the actor if `'actor'`, unassigns if `'none'`, or a specific member ID).
- `REJECT_TRANSITION`: Throws a `ValidationError` inside the pre-commit request cycle (only in sync mode).

## Execution Model

There are two execution paths.

### Sync Path: Pre-Commit Guard

Used for validation rules that must block a user mutation before it commits.

Flow:

```text
GraphQL task.update
-> TaskServiceImpl.updateTask
-> runSyncAutomationRules
-> load current task state
-> load active sync rules for STATUS_CHANGED
-> evaluate transition match (using trigger_value JSON)
-> evaluate condition
-> run action
-> action may throw ValidationError (rejecting the update)
-> only then call TaskQueries.updateTask
```

Key behavior:

- Runs before the database update.
- Only runs when `param.status` is present.
- Skips if the target status equals the current status.
- Throws before database write, so rejected transitions do not write task rows or outbox events.

### Async Path: Post-Commit Cascade

Used for background automation cascades after task events are already committed.

Flow:

```text
TaskService.updateTask commits task.updated outbox event
-> OutboxRelay publishes task.updated on task-events
-> TaskAutomationListener consumes task.updated
-> if status actually changed
-> load active async STATUS_CHANGED rules
-> evaluate transition match (using trigger_value JSON)
-> evaluate condition on the task
-> action calls taskService.updateTask
```

Key behavior:

- Runs after commit through the event bus.
- Highly scalable and decoupled: because actions invoke `taskService.updateTask`, standard outbox events propagate any new status changes, enabling natural, self-propagated cascades without complex graph reachability logic!
- Actions must call the standard task service. This preserves optimistic versions, outbox events, graph counters, subscriptions, and downstream cascades.

## Why Actions Call `taskService.updateTask`

Do not update `project_task` directly from automation actions.

The normal task update path is responsible for:

- Optimistic version increments.
- `updated_by` and `updated_at`.
- `task.updated` outbox events.
- Existing sync orchestration hooks.
- Realtime/subscription propagation.
- Future cross-module invariants.

Direct SQL writes would silently skip those behaviors.

## Graph Reachability Semantics

Blocking logic uses `task_reachability`.

For a task `B`, incomplete prerequisites are rows where:

```text
task_reachability.descendant_task_id = B.id
project_task.id = task_reachability.ancestor_task_id
project_task.status != DONE
```

That means both direct and transitive blockers count.

When task `A` becomes `DONE`, async unlock checks downstream tasks where:

```text
task_reachability.ancestor_task_id = A.id
task_reachability.depth > 0
```

Then `ALL_PREREQUISITES_DONE` re-checks all ancestors of each downstream task.
This prevents unlocking a task while another prerequisite is still incomplete.

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

Resolver behavior:

- Requires authenticated user.
- Delegates rule CRUD to `taskService`.
- Returns a server-driven metadata catalog for the UI.

The catalog defines labels, descriptions, input kinds, and dynamic option
sources. The frontend does not hardcode per-rule forms.

## Frontend Flow

The dashboard is available at:

```text
/projects/$projectId/automations
```

Runtime flow:

```text
AutomationDashboard
-> automationApi.getTemplatesCatalog(projectId)
-> automationApi.getRules(projectId)
-> render rule sections
-> open modal
-> AutomationFormRenderer renders fields from valueTemplate
-> create/update/delete/toggle rule through GraphQL
```

The renderer supports:

- `NONE`: no input.
- `TEXT`: text input.
- `NUMBER`: numeric input.
- `SELECT`: native select.

For `dynamicOptionsSource === "PROJECT_STATUSES"`, the frontend builds options
from common statuses and statuses seen in the current project task slice.

## Adding A New Trigger

1. Add the string key to `AUTOMATION_TRIGGERS` in `AutomationRegistry.ts`.
2. Add template metadata in `task-automation.ts`.
3. Add execution logic:
   - Sync triggers usually belong in `TaskServiceImpl.runSyncAutomationRules`.
   - Async triggers usually need an event listener or an existing listener hook.
4. Add or update tests.
5. Run:

```bash
cd modular-monolith
bun run check-types
bun run test
```

If frontend catalog rendering changes:

```bash
cd ui-v1
bun x tsc --noEmit
bun run build
```

## Adding A New Condition

1. Add the key to `AUTOMATION_CONDITION_TYPES`.
2. Implement callback in `AUTOMATION_CONDITIONS`.
3. Keep the signature:

```ts
(task: Task, value: string | null) => Promise<boolean>
```

4. Add template metadata in `task-automation.ts`.
5. Add tests for true and false cases.

Rules:

- Conditions must be deterministic.
- Conditions should not mutate state.
- Conditions may query the database.
- Conditions should return `false` for unsupported or missing optional data.

## Adding A New Action

1. Add the key to `AUTOMATION_ACTION_TYPES`.
2. Implement callback in `AUTOMATION_ACTIONS`.
3. Keep the signature:

```ts
(task: Task, value: string | null, ctx: AutomationActionContext) => Promise<void>
```

4. Add template metadata in `task-automation.ts`.
5. Add tests.

Rules:

- Mutating actions should call `ctx.taskService`.
- Sync-only actions must check `ctx.isSync`.
- Async actions should avoid no-op writes. Example: `SET_STATUS` returns early
  if the task is already in the target status.
- Do not swallow domain errors unless the product explicitly wants best-effort
  behavior.

## Validation And Safety

Service validation happens in `TaskServiceImpl.validateAutomationRuleInput`.

It checks:

- Required rule name on create.
- Supported trigger type.
- Supported condition type.
- Supported action type.
- Null booleans are rejected on update.

Access control happens in `ensureAutomationProjectAccess`.

Allowed actors:

- Project owner.
- Project member.
- System actors where actor id starts with `system:`.

## Tests

`TaskAutomation.test.ts` covers:

- Sync transition rejection:
  - Active sync rule matches `TASK_STATUS_CHANGED`.
  - `IS_BLOCKED` returns true.
  - `REJECT_TRANSITION` throws `ValidationError`.
  - Underlying task update query is not called.
- Async blocker unlocking:
  - Task transitions into `DONE`.
  - Listener finds async `PREREQUISITE_COMPLETED` rule.
  - `ALL_PREREQUISITES_DONE` returns true.
  - Action calls `taskService.updateTask` with `status: "READY"`.

Full verification used during initial implementation:

```bash
cd modular-monolith
bun run check-types
DB_PORT=5435 bun run test
bun run test:e2e:open
bun run test:e2e:run
bun run test:e2e:close

cd ../ui-v1
bun x tsc --noEmit
bun run build
```

## Common Debugging Checklist

Rule does not appear in dashboard:

- Check `taskAutomationRules(projectId)` response.
- Check user has project access.
- Check the rule row has correct `fk_project_id`.

Rule form has no options:

- Check `automationTemplatesCatalog(projectId)`.
- Check `valueTemplate.inputType`.
- For statuses, check project tasks or common fallback statuses.

Sync block does not happen:

- Rule must be active.
- Rule must have `is_sync = true`.
- `trigger_type` must be `TASK_STATUS_CHANGED`.
- `trigger_value` must equal target status or be null.
- The task must have a real status change.
- The condition must return true.

Async cascade does not happen:

- Rule must be active.
- Rule must have `is_sync = false`.
- `trigger_type` must be `PREREQUISITE_COMPLETED`.
- Source task must transition into `DONE`.
- `TaskAutomationListener` must be registered in Kafka registry.
- `task_reachability` must contain ancestor/descendant rows.
- `ALL_PREREQUISITES_DONE` must return true.

Version conflict during async action:

- Another update probably changed the downstream task first.
- The current implementation lets normal optimistic locking behavior surface.
- If best-effort retry is needed later, add it in the action or listener with
  bounded retry and fresh task reload.

## Design Constraints

Keep these constraints unless the architecture is intentionally revised:

- No user-authored code execution.
- No expression tree interpreter.
- No nested JSON rule graphs.
- No direct SQL mutation from actions when `taskService` can perform it.
- Keep registry keys finite and reviewable.
- Keep frontend form rendering server-driven.
- Keep sync guards fast enough for request-response latency.
- Keep async listeners idempotent enough to tolerate event replay.

## Current Gaps

- `TAG_CONTAINS` is a placeholder until task tags exist.
- `MEMBER_ASSIGNED` is cataloged but not wired into an execution path yet.
- Status options come from common frontend defaults plus loaded task statuses,
  not a dedicated project status catalog.
- Async action retry on optimistic conflict is not implemented.

