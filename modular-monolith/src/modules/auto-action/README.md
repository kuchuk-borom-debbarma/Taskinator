# Auto-Action Automation Module

The `auto-action` module is a high-performance, modular, and loosely coupled automation engine designed to execute scoped task-based triggers and actions. It allows users to define custom automation rules (e.g., "when a task is updated, change its status" or "when a task is created, send a notification") via a unified framework that seamlessly integrates with the modular monolith architecture.

---

## 🏗️ High-Level Architecture

The engine is built around the concept of **Entity Scopes** (currently restricted strictly to `TASK`). Instead of executing actions using stale event payload data, the system relies on a **lightweight, fresh-fetch, and optimistic locking design**:

```mermaid
sequence-chart
Title: Scoped TASK Automation Lifecycle
Domain Event -> Auto-Action Engine: Triggers event (e.g., task.updated)
Auto-Action Engine -> Registry: Fetches registered actions & Zod inputs
Auto-Action Engine -> Database: SELECT fresh task state by ID (always-fresh)
Database -> Auto-Action Engine: Returns current task and version
Auto-Action Engine -> Auto-Action Engine: Validates Zod inputs & state constraints
Auto-Action Engine -> Database: UPDATE task SET status = X, version = version + 1 WHERE version = current
Database -> Auto-Action Engine: Update Result (Optimistic Lock check)
Note over Auto-Action Engine: Throws "Optimistic Lock Failure" if 0 rows updated
```

### Core Design Principles

1. **Task-Scoped Boundaries**: Ensures triggers and actions are bound logically to a specific entity scope, preventing complex context mismatch on the frontend.
2. **Lightweight Contexts**: The context carries minimal fields (`taskId`, `projectId`, `actorId`, `traceId`) along with state comparison values (`prev_` and `current_` properties) rather than heavy hydrated records.
3. **Always-Fresh Reads**: Action handlers use the `taskId` to query the database dynamically, ensuring they act on the absolute latest state of the task.
4. **Optimistic Concurrency Control**: All writes to the database enforce strict optimistic locking using the task's `version` column to prevent overwriting concurrent updates.
5. **Seamless Frontend Contracts**: Zod schemas are automatically serialized into simple, frontend-friendly JSON structures, making form building on the UI extremely simple and robust.

---

## 📁 Codebase Directory Structure

```
src/modules/auto-action/
├── README.md               # This documentation file
├── index.ts                # Module entry point, exports, and initializer
├── types.ts                # Core types and Zod validation schemas
├── registry.ts             # Global in-memory trigger/action registry
├── triggers.ts             # Trigger definitions (e.g., task.created)
├── actions/                # Folder containing concrete actions
│   └── setFields.ts        # Updates multiple task fields using optimistic locking
└── __tests__/              # Unit and integration test suite
    └── autoAction.test.ts  # Tests for registry, triggers, and actions
```

---

## 🧩 Module Components Deep-Dive

### 1. Types & Schemas (`types.ts`)
Defines the core domain abstractions:
* **`EntityScope`**: Enum limiting scope (e.g., `TASK`).
* **`TaskContext` / `taskContextSchema`**: Standardizes the metadata payload carried by a trigger (including `prev_status`, `current_status`, etc.).
* **`TriggerDefinition`**: Defines a trigger's ID, name, and scope.
* **`ActionDefinition<T>`**: Defines an executable action, its metadata, input Zod schema, and execution handler.

### 2. Registry (`registry.ts`)
The `AutoActionRegistry` is a thread-safe singleton that holds active triggers and actions.
* **Schema Serialization**: Features a robust `serializeZodSchema()` helper which unwraps complex nested Zod schemas (such as `ZodOptional` and `ZodNullable`) and maps them to a simplified JSON format:
  ```json
  {
    "status": { "type": "string", "required": false }
  }
  ```
* **Template Generation**: Exposes `getTemplateForScope()`, giving the frontend a complete menu of compatible triggers, actions, and available context variables for UI builder dropdowns.

### 3. Triggers (`triggers.ts`)
Registers starter events that kickstart automation rules:
* `task.created`: Fired when a task is first created.
* `task.updated`: Fired when properties on a task are changed.

### 4. Actions (`actions/*`)
* **`setFields.ts`**:
  * Exposes input schemas for `status`, `title`, `description`, `teamId`, and `memberId`.
  * Fetches the latest database record of the task before performing operations.
  * Maps `teamId` and `memberId` to the proper database columns (`fk_team_id` and `fk_member_id` respectively).
  * Asserts optimistic locking:
    ```typescript
    const result = await db.updateTable('project_task')
        .set({ ...fields, version: currentVersion + 1 })
        .where('id', '=', taskId)
        .where('version', '=', currentVersion)
        .executeTakeFirst();
    ```

### 5. Module Entry Point (`index.ts`)
Coordinates the bootstrapping lifecycle. When `init()` is called, it registers the concrete actions and triggers into the global singleton registry.

---

## 🧪 Verification & Testing

The module maintains high-quality standards with a robust test suite in `__tests__/autoAction.test.ts` running on **Bun Test**:

* **Registry Assertions**: Verifies correct catalog registration and metadata outputs.
* **Action Logic Assertions**: Mocks Kysely's low-level executor to verify:
  1. Fresh select queries are invoked with correct task IDs.
  2. Optimistic locking queries increment versions correctly.
  3. Concurrent modification errors are successfully raised when `numAffectedRows === 0n`.
  4. Multi-field updates correctly map object properties to the database schema.
  5. Updates with zero specified fields are safely ignored as no-ops.

To execute tests:
```bash
bun test src/modules/auto-action/__tests__/autoAction.test.ts
```

To run typechecking:
```bash
bun x tsc --noEmit
```
