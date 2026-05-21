# Requirements: Milestone v13.0 — Auto Action Module Re-sectoring

## Milestone Goal

Restructure the `auto-action` module so it is architecturally consistent with every other module in the system.

Two concrete problems are being fixed:

1. **Direct DB access inside `auto-action` scope code** — `context.ts` and `setFields.ts` call `db` directly instead of going through the owning module's service interface. Any interaction with another entity (e.g., Task) must go through that entity's service (`taskService`), not bare SQL.

2. **Manager ≠ project pattern** — `auto-action-engine/manager.ts` houses both business logic and raw DB queries inline. Every other module separates these into `internal/Queries.ts` (raw DB) and a `ServiceImpl` (business logic) behind a public `Service` interface. The auto-action module must match this pattern.

---

## 1. Auto Action Service Interface & Implementation

Replace `auto-action-engine/manager.ts` with a proper service layer that mirrors the task/project/team pattern.

### Requirements

* **REQ-01** — Create `auto-action/AutoActionService.ts` defining the `AutoActionService` interface:
  * `createAutoAction(data): Promise<AutoAction>`
  * `updateAutoAction(id, data, expectedVersion): Promise<AutoAction>`
  * `deleteAutoAction(id): Promise<void>`
  * `getAutoActionsForProject(projectId): Promise<AutoAction[]>`
  * `getAutoActionById(id): Promise<AutoAction | undefined>`

* **REQ-02** — Create `auto-action/internal/AutoActionQueries.ts` containing all raw Kysely DB queries (extracted verbatim from `manager.ts`):
  * `insertAutoAction(data): Promise<AutoAction>`
  * `updateAutoActionById(id, patch, expectedVersion): Promise<AutoAction>`
  * `deleteAutoActionById(id): Promise<void>`
  * `selectAutoActionsForProject(projectId): Promise<AutoAction[]>`
  * `selectAutoActionById(id): Promise<AutoAction | undefined>`

* **REQ-03** — Create `auto-action/internal/AutoActionServiceImpl.ts` implementing `AutoActionService`:
  * Business logic (name uniqueness check, sync-safety validation, OCC) lives here
  * All DB access goes through `AutoActionQueries`
  * Matches the logger pattern of `TaskServiceImpl`

* **REQ-04** — Export a singleton `autoActionService` from `auto-action/index.ts`, analogous to how `taskService` is exported from `task/index.ts`.

* **REQ-05** — Delete `auto-action-engine/manager.ts`. All consumers that imported from `manager.ts` must be updated to use `autoActionService`.

---

## 2. Task Scope: Route Through `taskService` Instead of Direct DB

The `scopes/task/` code currently calls `db` directly for two operations. Both must be replaced with calls to the already-available `taskService` singleton.

### Requirements

* **REQ-06** — `scopes/task/context.ts`: Replace the inline Kysely `selectFrom('project_task')` query with a call to a dedicated method on `taskService`.

  The `TaskService` interface must be extended with a single internal method:
  ```ts
  getTaskContextById(taskId: string): Promise<TaskContextRow>
  ```
  where `TaskContextRow` is a minimal type containing only the fields the context resolver needs (`id`, `fk_project_id`, `fk_team_id`, `fk_member_id`, `title`, `status`, `priority`, `version`, `prev_*` columns).

  > **Note:** This is an unauthorized internal method — no actor permission check needed, same pattern as `getTasksByIds`.

* **REQ-07** — `scopes/task/actions/setFields.ts`: Replace the inline `selectFrom('project_task')` (version fetch) and inline `updateTable('project_task')` (update with `prev_` writes) with a call to `taskService.updateTask(...)`.

  The `TaskService.updateTask` signature already accepts all required fields (`status`, `title`, `teamId`, `memberId`). The `setFields` action must:
  1. Call `taskService.getTaskContextById(taskId)` to get the current version.
  2. Call `taskService.updateTask({ actorId, projectId, taskId, version, ...inputs })`.
  
  > `prev_` column writes continue to happen inside `TaskQueries.updateTask` exactly as before — this is not removed, just the caller changes.

---

## 3. Rename: `manager.ts` → `queries.ts` inside `auto-action-engine`

The directory name `auto-action-engine` currently contains `manager.ts`. Once the service layer is in `internal/`, the `auto-action-engine` directory holds only execution-engine concerns (executor, template, types). The `manager.ts` file is removed (its contents migrate to `AutoActionQueries` + `AutoActionServiceImpl`).

### Requirements

* **REQ-08** — `auto-action-engine/index.ts` must re-export only: `executor`, `template`, `types`. It must no longer export anything from `manager.ts`.

---

## 4. Tests

### Requirements

* **REQ-09** — Update `__tests__/autoActionEngine.test.ts`:
  * All test cases that previously called `createAutoAction` / `updateAutoAction` / `deleteAutoAction` from `manager.ts` must now use `autoActionService.*` methods.
  * Mock `taskService.getTaskContextById` and `taskService.updateTask` in the `setFields` action tests.
  * All 48+ tests must remain passing.

* **REQ-10** — No new test file is required — existing tests are sufficient after updating import paths and mock targets.

---

## 5. Module Consistency Checklist

After this milestone, the `auto-action` module must satisfy:

| Criterion | Pattern | Status |
|---|---|---|
| Public service interface file | `AutoActionService.ts` | To be created |
| Raw queries file | `internal/AutoActionQueries.ts` | To be created |
| Service implementation | `internal/AutoActionServiceImpl.ts` | To be created |
| Singleton export | `autoActionService` from `index.ts` | To be created |
| No direct `db` access in scope code | `scopes/task/context.ts`, `scopes/task/actions/setFields.ts` | To be fixed |
| No cross-module raw DB calls | All task operations via `taskService` | To be fixed |
