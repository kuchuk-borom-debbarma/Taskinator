# Requirements Specifications - Milestone v11.0 (Context Engine)

## 1. Dynamic Database Context Resolver Registry

The `auto-action` module needs a centralized way to resolve entity context (e.g. `TaskContext`) directly from the database for any supported scope.

### Requirements:
* **REQ-01**: Implement `src/modules/auto-action/contextEngine.ts` housing the core context resolution primitives.
* **REQ-02**: Expose a `ContextResolverRegistry` class to allow registering scope-specific resolvers.
  * Must map scope name (e.g., `'TASK'`) to a `ContextResolver` definition.
  * Expose a singleton instance `contextResolverRegistry`.
* **REQ-03**: Expose a standard, stateless `fetchContext(options)` function:
  * Takes `scope`, `entityId`, `actorId`, `traceId`, and a previous state snapshot.
  * Looks up the registered resolver for that scope.
  * Calls the resolver to fetch the latest state from the database, builds the unified context, and validates it against the scope's strict Zod schema.

---

## 2. Task Scope Context Resolver

We will implement the concrete database context fetching resolver for the `TASK` scope.

### Requirements:
* **REQ-04**: Implement task context resolver in `src/modules/auto-action/scopes/task/context.ts`:
  * Fetch fresh task data from the `project_task` table using Kysely.
  * Map columns (e.g., `status`, `priority`, `title`, `fk_team_id`, `fk_member_id`, `version`) to the `current_` properties of `TaskContext`.
  * Map the input previous state snapshot to the `prev_` properties of `TaskContext`.
  * Validate the constructed context object against `taskContextSchema` to ensure type-safe, complete contexts before executing conditions/actions.
* **REQ-05**: Register the task context resolver in the registry during `initTaskScope()`.

---

## 3. Entrypoint & Testing

* **REQ-06**: Re-export `contextResolverRegistry` and `fetchContext` from the root `index.ts` of the `auto-action` module.
* **REQ-07**: Implement comprehensive unit tests in `src/modules/auto-action/__tests__/contextEngine.test.ts` asserting:
  * Correct registration and retrieval of context resolvers.
  * Successful database fetching and schema validation for valid tasks.
  * Rejection of invalid tasks, missing tasks, or schemas containing structural type mismatch.
