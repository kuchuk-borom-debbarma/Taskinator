# Phase 37 — Auto Action Re-sectoring

## Objective

Make the `auto-action` module architecturally consistent with every other module in the system by:

1. **Service layer**: Replace `auto-action-engine/manager.ts` with a proper `AutoActionService` interface → `internal/AutoActionServiceImpl` → `internal/AutoActionQueries` layering.
2. **Decoupled DB access**: Route all Task interactions in `scopes/task/` through `taskService` instead of calling `db` directly.

---

## Plan A — Auto Action Service Layer

### A1 — Create `AutoActionService.ts` (public interface)

**File:** `src/modules/auto-action/AutoActionService.ts` [NEW]

```ts
import type { AutoAction, AutoActionUpdate, NewAutoAction } from '../../database/tables/AutoAction.ts';

export interface AutoActionService {
    createAutoAction(data: NewAutoAction): Promise<AutoAction>;
    updateAutoAction(id: string, data: AutoActionUpdate, expectedVersion: number): Promise<AutoAction>;
    deleteAutoAction(id: string): Promise<void>;
    getAutoActionsForProject(projectId: string): Promise<AutoAction[]>;
    getAutoActionById(id: string): Promise<AutoAction | undefined>;
}
```

---

### A2 — Create `internal/AutoActionQueries.ts` (raw Kysely — extracted from `manager.ts`)

**File:** `src/modules/auto-action/internal/AutoActionQueries.ts` [NEW]

Five pure DB functions — zero business logic:

```ts
export async function insertAutoAction(data: NewAutoAction): Promise<AutoAction>
export async function updateAutoActionById(id: string, patch: Record<string,any>, expectedVersion: number): Promise<AutoAction>
export async function deleteAutoActionById(id: string): Promise<void>
export async function selectAutoActionsForProject(projectId: string): Promise<AutoAction[]>
export async function selectAutoActionById(id: string): Promise<AutoAction | undefined>
```

Implementation detail for `updateAutoActionById`:
- Accepts a pre-cleaned patch object (no `undefined` values)
- Runs `db.updateTable('auto_action').set(patch).where('id','=',id).where('version','=',expectedVersion).returningAll().executeTakeFirst()`
- Throws if no row returned (concurrent update)

---

### A3 — Create `internal/AutoActionServiceImpl.ts` (business logic)

**File:** `src/modules/auto-action/internal/AutoActionServiceImpl.ts` [NEW]

Implements `AutoActionService`. Contains ALL business logic verbatim from `manager.ts`:
- `checkNameUniqueness` (private)
- `validatePipeline` (private)
- `createAutoAction` → name uniqueness + pipeline validation → `insertAutoAction`
- `updateAutoAction` → fetch current via `selectAutoActionById` → OCC check → name uniqueness → pipeline validation → `updateAutoActionById`
- `deleteAutoAction` → `deleteAutoActionById`
- `getAutoActionsForProject` → `selectAutoActionsForProject`
- `getAutoActionById` → `selectAutoActionById`

Logger pattern: Add `logger.info/debug` calls matching the `TaskServiceImpl` style.

---

### A4 — Update `auto-action/index.ts` — export singleton

**File:** `src/modules/auto-action/index.ts` [MODIFY]

Add after imports:
```ts
import { AutoActionServiceImpl } from './internal/AutoActionServiceImpl.ts';
export const autoActionService = new AutoActionServiceImpl();
```

Also export the `AutoActionService` type:
```ts
export type { AutoActionService } from './AutoActionService.ts';
```

---

### A5 — Delete `manager.ts`, clean `auto-action-engine/index.ts`

**File:** `src/modules/auto-action/auto-action-engine/manager.ts` [DELETE]

**File:** `src/modules/auto-action/auto-action-engine/index.ts` [MODIFY]

Remove `export * from './manager.ts'`. Keep only:
```ts
export * from './executor.ts';
export * from './template.ts';
export * from './types.ts';
```

---

## Plan B — Task Scope Decoupling

### B1 — Add `getTaskContextById` to `TaskService` interface

**File:** `src/modules/task/TaskService.ts` [MODIFY]

Add a new internal-only method to the `TaskService` interface:

```ts
/**
 * Internal fetch for auto-action context resolution.
 * No actor permission check — caller is trusted (auto-action engine).
 */
getTaskContextById(taskId: string): Promise<TaskContextRow | undefined>;
```

Add the `TaskContextRow` type in the same file:

```ts
export type TaskContextRow = {
    id: string;
    fk_project_id: string;
    fk_team_id: string | null;
    fk_member_id: string | null;
    title: string;
    status: string;
    priority: number;
    version: number;
    prev_status: string | null;
    prev_priority: number | null;
    prev_title: string | null;
    prev_team_id: string | null;
    prev_member_id: string | null;
};
```

---

### B2 — Implement `getTaskContextById` in `TaskQueries.ts`

**File:** `src/modules/task/internal/TaskQueries.ts` [MODIFY]

Add a new exported query function at the bottom:

```ts
export async function getTaskContextById(
    taskId: string,
): Promise<TaskContextRow | undefined> {
    return db
        .selectFrom('project_task')
        .select([
            'id', 'fk_project_id', 'fk_team_id', 'fk_member_id',
            'title', 'status', 'priority', 'version',
            'prev_status', 'prev_priority', 'prev_title',
            'prev_team_id', 'prev_member_id',
        ])
        .where('id', '=', taskId as any)
        .executeTakeFirst();
}
```

---

### B3 — Implement in `TaskServiceImpl.ts`

**File:** `src/modules/task/internal/TaskServiceImpl.ts` [MODIFY]

Add:
```ts
import { getTaskContextById as getTaskContextByIdQuery } from './TaskQueries.ts';

// inside TaskServiceImpl class:
async getTaskContextById(taskId: string): Promise<TaskContextRow | undefined> {
    logger.debug(`TaskService.getTaskContextById called for task: ${taskId}`);
    return getTaskContextByIdQuery(taskId);
}
```

---

### B4 — Rewrite `scopes/task/context.ts`

**File:** `src/modules/auto-action/scopes/task/context.ts` [MODIFY]

Remove the `import { db } from '../../../../database/index.js'` line entirely.

Import `taskService` instead:
```ts
import { taskService } from '../../../task/index.js';
```

Replace the entire `db.selectFrom('project_task')...` block with:
```ts
const task = await taskService.getTaskContextById(entityId);
```

Everything else (the `prev_` priority resolution chain, schema validation) stays identical.

---

### B5 — Rewrite `scopes/task/actions/setFields.ts`

**File:** `src/modules/auto-action/scopes/task/actions/setFields.ts` [MODIFY]

Remove `import { db } from '../../../../../database/index.js'`.

Import `taskService`:
```ts
import { taskService } from '../../../../task/index.js';
```

Replace the two DB operations (version fetch + update) with:

```ts
async handler(ctx: TaskContext, inputs: z.infer<typeof inputSchema>): Promise<void> {
    const { taskId } = ctx;

    // 1. Fetch fresh task data via taskService (gets current version + projectId)
    const task = await taskService.getTaskContextById(taskId);
    if (!task) {
        throw new Error(`[SetFieldsAction] Task with ID "${taskId}" not found.`);
    }

    // 2. No-op if no inputs are defined
    const hasUpdates = Object.values(inputs).some((v) => v !== undefined);
    if (!hasUpdates) return;

    // 3. Delegate to taskService.updateTask — prev_ writes happen inside TaskQueries.updateTask
    //    description is passed through directly; taskService.updateTask already supports it.
    await taskService.updateTask({
        actorId: ctx.actorId,
        projectId: task.fk_project_id,
        taskId,
        version: task.version,
        title: inputs.title,
        description: inputs.description,   // ← kept: already in TaskService.updateTask signature
        status: inputs.status,
        teamId: inputs.teamId,
        memberId: inputs.memberId,
    });
},
```

`inputSchema` is **unchanged** — `description` stays, and all fields remain available in the frontend template catalog.

---

## Plan C — Tests

### C1 — Update `autoActionEngine.test.ts`

**File:** `src/modules/auto-action/__tests__/autoActionEngine.test.ts` [MODIFY]

**Import changes:**
```ts
// Before:
import { createAutoAction, updateAutoAction } from '../auto-action-engine/manager.ts';

// After:
import { autoActionService } from '../index.js';
```

**Test body changes:**
- Replace all `createAutoAction(...)` calls with `autoActionService.createAutoAction(...)`
- Replace all `updateAutoAction(...)` calls with `autoActionService.updateAutoAction(...)`

**Mock changes for context + setFields tests:**
- Tests that mock `project_task` SELECT queries: these now fire via `taskService.getTaskContextById` which still hits `db` under the hood → the existing `executeSpy` on `db.getExecutor().executeQuery` continues to intercept them. **No mock changes needed for context tests.**
- `setFields` tests: the action now calls `taskService.updateTask` which calls `TaskQueries.updateTask` which hits `db`. The existing `executeSpy` intercepts `update project_task` queries too. **No mock changes needed for setFields tests.**

> The `executeSpy` approach (patching `db.getExecutor().executeQuery`) intercepts ALL Kysely queries regardless of which layer calls them. This is why the test architecture is already future-proof for this refactor.

---

## Verification

```bash
# 1. TypeScript — zero errors
bun x tsc --noEmit

# 2. Full test suite — 48+ tests pass
bun test src/modules/auto-action/__tests__
```

**Expected result:** All 48 existing tests pass without modification to any test assertions. Only import paths in the test file change.

---

## File Change Summary

| File | Action |
|---|---|
| `auto-action/AutoActionService.ts` | **NEW** |
| `auto-action/internal/AutoActionQueries.ts` | **NEW** |
| `auto-action/internal/AutoActionServiceImpl.ts` | **NEW** |
| `auto-action/index.ts` | **MODIFY** — add singleton + type export |
| `auto-action/auto-action-engine/manager.ts` | **DELETE** |
| `auto-action/auto-action-engine/index.ts` | **MODIFY** — remove manager export |
| `task/TaskService.ts` | **MODIFY** — add `TaskContextRow` type + `getTaskContextById` |
| `task/internal/TaskQueries.ts` | **MODIFY** — add `getTaskContextById` query |
| `task/internal/TaskServiceImpl.ts` | **MODIFY** — implement `getTaskContextById` |
| `auto-action/scopes/task/context.ts` | **MODIFY** — use `taskService` instead of `db` |
| `auto-action/scopes/task/actions/setFields.ts` | **MODIFY** — use `taskService` instead of `db` |
| `auto-action/__tests__/autoActionEngine.test.ts` | **MODIFY** — update import + call sites |

**Execution order:** A1 → A2 → A3 → A4 → A5 → B1 → B2 → B3 → B4 → B5 → C1 → Verify
