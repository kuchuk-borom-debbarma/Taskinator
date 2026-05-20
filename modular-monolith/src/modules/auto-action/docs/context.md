# Context Engine & Database Resolvers

This document describes the design, implementation, and type-safety mechanisms of the Context Engine inside the `auto-action` module.

---

## 1. Architectural Role & Responsibilities

The **Context Engine** is the central component responsible for constructing a unified, validated representation of an entity's state (e.g., a `TaskContext`) at the time an automation trigger is fired. 

It fulfills three critical engineering requirements:
1. **Loose Coupling**: It decouples the core automation engine from database schemas. The core engine does not perform SQL queries or understand the specific database structure of tasks, projects, or teams.
2. **Deterministic State Reconstruction**: It resolves the *current* state from live database fields and reconstructs the *previous* state by intelligently merging historical snapshots (`wasSnapshot`) provided by domain events.
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

## 4. Reconstructing History: `wasSnapshot` Merging Rules

To evaluate rules that check "transitions" (e.g. status changing *from* X *to* Y), the engine needs to represent the task's historical state prior to the event. The `wasSnapshot` parameter carries this historical data.

The context resolver integrates this data into the final context object by mapping properties onto `prev_` fields. Because events can originate from different subsystems, the merging layer is built to be highly robust and supports three distinct snapshot payload styles:

### Rule 4.1: Standard Database/Snake_Case Columns
If the snapshot contains standard database column names (which is common for event payloads generated directly by the ORM layer or CDC streams), the resolver maps them directly to their corresponding `prev_` counterparts:
* `status` ➡️ `prev_status`
* `priority` ➡️ `prev_priority`
* `title` ➡️ `prev_title`
* `fk_team_id` ➡️ `prev_team_id`
* `fk_member_id` ➡️ `prev_member_id`
* `version` ➡️ `prev_version`

### Rule 4.2: GraphQL/CamelCase Aliases
If the event is fired from user-facing APIs, GraphQL resolvers, or client mutations, team and member properties may be passed using standard camelCase formats (`teamId`, `memberId`). The resolver maps these to the unified snake_case keys:
* `teamId` ➡️ `prev_team_id`
* `memberId` ➡️ `prev_member_id`

### Rule 4.3: Explicit `prev_` Keys
In cases where a calling component has already performed pre-normalization, the resolver accepts and preserves explicit `prev_` keys without alteration:
* `prev_status` ➡️ `prev_status`
* `prev_priority` ➡️ `prev_priority`

### Fallback Priority Resolution
The resolver resolves keys in order of specificity. For example, for team assignments, the fallback resolution is executed in the following priority order:
1. Standard column: `was.fk_team_id`
2. CamelCase alias: `was.teamId`
3. Explicit key: `was.prev_team_id`
4. Fallback default: `null`

#### Implementation Pattern (`scopes/task/context.ts`):
```typescript
prev_team_id: was.fk_team_id !== undefined 
    ? was.fk_team_id 
    : (was.teamId !== undefined 
        ? was.teamId 
        : (was.prev_team_id !== undefined ? was.prev_team_id : null))
```

---

## 5. TASK Scope Resolver Concrete Walkthrough

Below is a detailed, annotated trace of the `taskContextResolver` querying a task and producing the schema-valid `TaskContext` payload.

### 5.1 Database Query
The resolver executes a single, highly-optimized Kysely query to select exactly the columns needed:
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
    ])
    .where('id', '=', entityId)
    .executeTakeFirst();
```

### 5.2 Context Generation Output
Given a task row in the database with status = `IN_PROGRESS` and version = `2`, and a `wasSnapshot` containing `{ status: "TODO" }`, the resolver resolves the values and validates them against `taskContextSchema` to produce:

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
This payload is now fully type-safe, validated, and ready for sub-millisecond evaluation in the condition AST evaluator.
