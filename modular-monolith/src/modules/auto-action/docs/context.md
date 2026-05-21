# Context Engine & Database Resolvers

This document describes the design, implementation, and type-safety mechanisms of the Context Engine inside the `auto-action` module.

---

## 1. Architectural Role & Responsibilities

The **Context Engine** is the central component responsible for constructing a unified, validated representation of an entity's state (e.g., a `TaskContext`) at the time an automation trigger is fired.

It fulfills three critical engineering requirements:
1. **Loose Coupling**: It decouples the core automation engine from database schemas. The core engine does not perform SQL queries or understand the specific database structure of tasks, projects, or teams.
2. **Deterministic State Reconstruction**: It resolves the *current* state from live database fields and reads the *previous* state from dedicated `prev_` columns that are persistently maintained directly in the `project_task` table.
3. **Type and Schema Guarantees**: It runs strict runtime schema checks using [Zod](https://github.com/colinhacks/zod) to guarantee that downstream engines (AST condition evaluators, action executors) always receive correctly-typed inputs.

```mermaid
graph TD
    TriggerEvent[⚡ Trigger Event & wasSnapshot] -->|Invoke fetchContext| ContextEngine[🗃️ Context Engine]
    ContextEngine -->|Registry Lookup| ResolverRegistry[ContextResolverRegistry]
    ResolverRegistry -->|Call resolve()| DBResolver[TaskContextResolver]
    DBResolver -->|SQL SELECT| Database[(PostgreSQL Database)]
    Database -->|Raw Fields| DBResolver
    DBResolver -->|Merge & CamelCase Normalize| ResolverOutput[Raw Context Object]
    ContextEngine -->|safeParse| ZodSchema[taskContextSchema]
    ZodSchema -->|Success| TypeSafeContext[Validated TaskContext]
```

---

## 2. Core Components

### 2.1 The `ContextResolver` Interface

Every domain scope (e.g., `TASK`) implements the generic `ContextResolver` interface. Resolvers must reside inside their specific scope folder (e.g., `scopes/task/context.ts`) to maintain complete module isolation.

```typescript
import { z } from 'zod';

export interface ContextResolver<T = any> {
    scope: string;
    schema: z.ZodType<T>;
    resolve(
        entityId: string,
        actorId: string,
        traceId: string,
        wasSnapshot?: Record<string, any>,
    ): Promise<T>;
}
```

### 2.2 Centralized Registry (`ContextResolverRegistry`)

A singleton registry container (`contextResolverRegistry`) manages the active mapping of scope names to their respective resolvers.

* **Self-Bootstrapping**: Scope initializers (e.g., `initTaskScope()`) register their resolvers on startup.
* **Registry Safeguards**: The registry actively throws an error if any component attempts to register a duplicate resolver for the same scope, preventing silent overrides.

```typescript
export class ContextResolverRegistry {
    private resolvers = new Map<string, ContextResolver>();

    registerResolver(resolver: ContextResolver): void {
        if (this.resolvers.has(resolver.scope)) {
            throw new Error(`[ContextResolverRegistry] Duplicate resolver registered for scope: "${resolver.scope}"`);
        }
        this.resolvers.set(resolver.scope, resolver);
    }

    getResolver(scope: string): ContextResolver {
        const resolver = this.resolvers.get(scope);
        if (!resolver) {
            throw new Error(`[ContextResolverRegistry] No context resolver found for scope: "${scope}"`);
        }
        return resolver;
    }
}
```

---

## 3. Dynamic Resolution and Merging Flow (`fetchContext`)

The `fetchContext` function is the unified, global entrypoint used across the automation engine. It acts as an execution harness wrapping resolver invocation and schema enforcement:

```typescript
export async function fetchContext(
    scope: string,
    entityId: string,
    actorId: string,
    traceId: string,
    wasSnapshot?: Record<string, any>,
): Promise<any> {
    // 1. Retrieve the registered scope resolver
    const resolver = contextResolverRegistry.getResolver(scope);

    // 2. Query DB and reconstruct current/previous states
    const rawContext = await resolver.resolve(entityId, actorId, traceId, wasSnapshot);

    // 3. Enforce runtime schema contract
    const result = resolver.schema.safeParse(rawContext);
    if (!result.success) {
        throw new Error(
            `[ContextEngine] Context validation failed for scope "${scope}". Errors: ${JSON.stringify(
                result.error.issues,
            )}`,
        );
    }

    return result.data;
}
```

---

## 4. Reconstructing History: `prev_` Columns & `wasSnapshot` Fallback

To evaluate rules that check transitions (e.g. status changing *from* X *to* Y), the engine needs the task's state prior to the current event. This is solved at two layers:

### 4.1 Persistent `prev_` Columns (Primary Source of Truth)

Every task write path atomically copies the current column values into their `prev_` counterparts in the same `UPDATE` statement. The `project_task` table carries these five columns:

| `prev_` column | Mirrors | Written by |
|---|---|---|
| `prev_status` | `status` | every task `UPDATE` |
| `prev_priority` | `priority` | every task `UPDATE` |
| `prev_title` | `title` | every task `UPDATE` |
| `prev_team_id` | `fk_team_id` | every task `UPDATE` and team unassign operations |
| `prev_member_id` | `fk_member_id` | every task `UPDATE` and member unassign operations |

This means that by the time `fetchContext` is called for step 2 of a pipeline, the database already contains the correct previous state from step 1's write — no event payload threading required.

### 4.2 `wasSnapshot` Fallback (Initial Trigger Only)

On the very first trigger of a pipeline, no prior write has occurred and the DB `prev_` columns are still `null`. In this case the resolver falls back to the `wasSnapshot` parameter passed from the triggering event. This supports three snapshot payload styles:

**Standard Database/Snake_case Columns** (ORM or CDC event payloads):
* `status` → `prev_status`
* `priority` → `prev_priority`
* `title` → `prev_title`
* `fk_team_id` → `prev_team_id`
* `fk_member_id` → `prev_member_id`
* `version` → `prev_version`

**GraphQL/CamelCase Aliases** (user-facing API payloads):
* `teamId` → `prev_team_id`
* `memberId` → `prev_member_id`

**Explicit `prev_` Keys** (pre-normalised payloads):
* `prev_status` → `prev_status` (preserved as-is)

### 4.3 Priority Resolution Chain

For each `prev_` field, the resolver applies this chain:

```
1. DB prev_ column (non-null)   ← primary source of truth
2. wasSnapshot standard key      ← fallback for initial trigger
3. wasSnapshot camelCase alias   ← fallback for API events
4. wasSnapshot explicit prev_ key
5. null
```

#### Implementation Pattern (`scopes/task/context.ts`):
```typescript
prev_team_id:
    task.prev_team_id !== null
        ? task.prev_team_id          // DB column wins if set
        : was.fk_team_id !== undefined
          ? was.fk_team_id           // snake_case snapshot fallback
          : was.teamId !== undefined
            ? was.teamId             // camelCase alias fallback
            : was.prev_team_id !== undefined
              ? was.prev_team_id     // explicit prev_ key fallback
              : null
```

> **Concurrency note**: Because `prev_` columns are written atomically alongside the actual field update, multiple auto-actions running in parallel all read from the same consistent database state — there is no risk of stale prev values caused by concurrent pipeline execution.

---

## 5. TASK Scope Resolver Concrete Walkthrough

Below is a detailed, annotated trace of the `taskContextResolver` querying a task and producing the schema-valid `TaskContext` payload.

### 5.1 Database Query
The resolver executes a single, highly-optimised Kysely query selecting both the current fields and the persisted `prev_` columns:
```typescript
const task = await db
    .selectFrom('project_task')
    .select([
        'id',
        'fk_project_id',
        'fk_team_id',
        'fk_member_id',
        'title',
        'status',
        'priority',
        'version',
        // Persisted previous-state columns
        'prev_status',
        'prev_priority',
        'prev_title',
        'prev_team_id',
        'prev_member_id',
    ])
    .where('id', '=', entityId)
    .executeTakeFirst();
```

### 5.2 Context Generation Output
Given a task row where `status = 'IN_PROGRESS'`, `prev_status = 'TODO'` (written by the update that fired the trigger), and `version = 2`, the resolver produces:

```json
{
  "traceId": "trace-uuid-12345",
  "scope": "TASK",
  "actorId": "user-999",
  "taskId": "task-8888",
  "projectId": "proj-7777",

  "prev_status": "TODO",
  "prev_priority": null,
  "prev_title": null,
  "prev_team_id": null,
  "prev_member_id": null,
  "prev_version": null,

  "current_status": "IN_PROGRESS",
  "current_priority": 1,
  "current_title": "Implement Context Engine Docs",
  "current_team_id": "team-456",
  "current_member_id": "member-789",
  "current_version": 2
}
```

Note that `prev_status` is read directly from the DB column — not from an event payload — making this safe at every step of a multi-step pipeline, including step 2+ where the original `wasSnapshot` would be stale.

This payload is now fully type-safe, validated, and ready for sub-millisecond evaluation in the condition AST evaluator.
