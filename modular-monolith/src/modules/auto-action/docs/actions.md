# Actions & Dynamic Field Updating

This document details how actions are dynamically registered, validated via Zod schemas, and executed under strict optimistic locking guarantees.

---

## 1. Action Definitions

An **Action** represents a mutation operation executed on a specific entity when an automation rule's conditions are satisfied. 

Actions implement the `ActionDefinition` interface, ensuring a unified registration schema:

```typescript
export interface ActionDefinition<ConfigSchema extends z.ZodObject<any> = z.ZodObject<any>> {
    readonly type: string;
    readonly name: string;
    readonly description?: string;
    readonly scope: EntityScope;
    readonly schema: ConfigSchema;
    execute(ctx: any, config: z.infer<ConfigSchema>): Promise<void>;
}
```

---

## 2. Dynamic Action Registration

Actions register programmatically during boot-up in the central `AutoActionRegistry`. In [scopes/task/actions/setFields.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/auto-action/scopes/task/actions/setFields.ts), the `setFields` action registers itself:

```typescript
export function registerSetFields(): void {
    autoActionRegistry.registerAction(setFieldsAction);
}
```

---

## 3. SetFields Action Deep-Dive

The `setFields` action is a task-scoped action that allows updating one or more standard task fields, teams, or members in a single step.

### Config Schema
The parameters passed to `setFields` are strictly checked using a Zod schema:

```typescript
export const setFieldsConfigSchema = z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    teamId: z.string().nullable().optional(),
    memberId: z.string().nullable().optional(),
});
```

---

## 4. Execution Lifecycle & Concurrency Control

When `setFieldsAction.execute()` is called, it follows a strict multi-step transactional lifecycle to ensure thread-safety and protect against lost updates:

```mermaid
sequence-chart
Title: Action Concurrency Lifecycle
Executor -> Database: 1. fresh-fetch task state (SELECT WHERE id = taskId)
Database -> Executor: Returns current record & current version
Executor -> Executor: 2. Validate input and calculate update payloads
Executor -> Database: 3. UPDATE task SET fields = X, version = version + 1 WHERE id = taskId AND version = current
Database -> Executor: Affected row count result (0 or 1)
Note over Executor: 4. Throw ConcurrentUpdateException if row count is 0
```

### 1. Fresh-Fetching
The action does **not** rely on values in the trigger context. Instead, it reads the latest entity state directly from the database:
```typescript
const task = await db.selectFrom('tasks')
    .selectAll()
    .where('id', '=', ctx.taskId)
    .executeTakeFirst();
```

### 2. Validation & Payload Preparation
The action validates the current entity state and user input. If team or member parameters are being modified, cascading assignment side effects are calculated:
* Removing a `teamId` cascadingly unassigns the task's assigned `memberId`.
* Directing updates to standard columns preserves other columns.

### 3. Atomic Optimistic locking Update
The update is pushed back to the database. It explicitly matches the fresh version retrieved during Step 1 and increments it:
```typescript
const result = await db.updateTable('tasks')
    .set({
        ...updates,
        version: task.version + 1,
    })
    .where('id', '=', ctx.taskId)
    .where('version', '=', task.version) // strict version check
    .executeTakeFirst();
```

### 4. Row Count Verification
If the database matches and updates exactly `1` row, the mutation is complete. If `0` rows were updated (meaning another thread committed a change first, changing the version number), the action throws a custom error to trigger a rollback:
```typescript
if (Number(result.numUpdatedRows) === 0) {
    throw new ConcurrentUpdateException(
        `Failed to execute auto-action: Task was updated concurrently by another operation.`
    );
}
```
This complete flow guarantees that all updates are thread-safe and never overwrite concurrent modifications.
