# Phase 13 Plan: E2E Integration & Polish

## Goal
Wire real GraphQL mutations (create autopilot, toggle isActive) end-to-end from the frontend through the new backend resolvers. Add Framer Motion polish on the dashboard page. This is the final phase of the v2.0 UI milestone.

## Scope

### What mutations do we need?
| Mutation | Backend change | Frontend change |
|---|---|---|
| `createAutopilot(...)` | Schema + resolver + DB insert | "New Autopilot" button → create flow |
| `toggleAutopilot(id, isActive)` | Schema + resolver + DB update | Toggle on `AutopilotCard` |

---

## Wave 1: Backend — GraphQL Mutations

### Task 1.1 — Extend autopilot.graphql schema
**File (MODIFY):** `modular-monolith/src/graphql/schema/autopilot/autopilot.graphql`

Add input types and mutations:

```graphql
input AutopilotActionInput {
  type: String!
  config: ConditionTree!
  position: Int!
}

input CreateAutopilotInput {
  projectId: ID!
  triggers: [String!]!
  conditions: ConditionTree!
  actions: [AutopilotActionInput!]!
}

extend type Mutation {
  createAutopilot(input: CreateAutopilotInput!): Autopilot!
  toggleAutopilot(id: ID!, isActive: Boolean!): Autopilot!
}
```

### Task 1.2 — Implement createAutopilot + toggleAutopilot in autopilot resolver
**File (MODIFY):** `modular-monolith/src/graphql/resolvers/autopilot.ts`

**`createAutopilot`:**
- Auth check: `if (!context.userId) throw new UnauthorizedError()`.
- Use `db.transaction()` to:
  1. `insertInto('autopilot')` with UUID, `fk_project_id`, triggers (array), conditions (JSON), `is_active: true`, `version: 1`.
  2. `insertInto('autopilot_action')` for each action in `input.actions` with `fk_autopilot_id`, type, config (JSON), position.
- Return the created autopilot via `AutopilotQueryService.getProjectAutopilots` single fetch — or inline query.

**`toggleAutopilot`:**
- Auth check.
- `db.updateTable('autopilot').set({ is_active: isActive, version: sql`version + 1` }).where('id', '=', id).returningAll()`.
- Return the updated autopilot mapped through the existing field resolvers.

---

## Wave 2: Backend — Type fix & action loading

### Task 2.1 — Add inline single-autopilot fetch helper
**File (MODIFY):** `modular-monolith/src/modules/autopilot/internal/AutopilotQueryService.ts`

Add `getAutopilotById(id: string): Promise<AutopilotWithActions | null>` — fetches one autopilot + its actions. Used by mutation resolvers to return the created/updated entity.

---

## Wave 3: Frontend — AutopilotAPI mutations

### Task 3.1 — Extend AutopilotAPI interface
**File (MODIFY):** `ui-v1/src/api/interfaces/AutopilotAPI.ts`

```ts
export interface CreateAutopilotInput {
  projectId: string;
  triggers: string[];
  conditions: AutopilotConditionNode;
  actions: { type: string; config: Record<string, any>; position: number }[];
}

// Add to AutopilotAPI interface:
createAutopilot(input: CreateAutopilotInput): Promise<AutopilotItem>;
toggleAutopilot(id: string, isActive: boolean): Promise<AutopilotItem>;
```

### Task 3.2 — Implement in GraphQLAutopilotAPI
**File (MODIFY):** `ui-v1/src/api/adapters/graphql/GraphQLAutopilotAPI.ts`

Implement `createAutopilot` and `toggleAutopilot` using the `query<T>()` helper (which handles both queries and mutations identically — just wraps fetch).

---

## Wave 4: Frontend — Create Flow

### Task 4.0 — Hook up ConditionBuilderCanvas onChange propagation
**File (MODIFY):** `ui-v1/src/components/Autopilot/Builder/ConditionBuilderCanvas.tsx`

- Import `graphToConditionTree` from `./treeDeserializer`.
- Add a `useEffect` (or helper) watching `nodes` and `edges` state changes.
- Whenever nodes/edges change (and not `readOnly`), compute `graphToConditionTree(nodes, edges, rootId)` and invoke `onChange(updatedTree)`.
- This ensures the parent form always receives the latest JSON structure from the canvas.

### Task 4.1 — CreateAutopilotModal
**File (NEW):** `ui-v1/src/components/Autopilot/CreateAutopilotModal.tsx`

Multi-step modal using existing `AppModal`:

**Step 1 — Triggers** (trigger event picker):
- Checkboxes: `task.created`, `task.updated`, `task.status_changed`, `task.assigned`.
- At least one required.

**Step 2 — Conditions**:
- Renders `<ConditionBuilderCanvas>` (editable, not read-only).
- Height: `400px`.

**Step 3 — Actions**:
- Renders `<ActionPipelineEditor>` (editable).

**Step 4 — Review & Confirm**:
- Summary card: triggers list + condition summary + action count.
- "Create Autopilot" button → fires mutation.

### Task 4.2 — Wire "New Autopilot" button in AutopilotDashboardView
**File (MODIFY):** `ui-v1/src/components/Autopilot/AutopilotDashboardView.tsx`

- Remove `disabled` from "New Autopilot" button.
- Add `open` state → renders `<CreateAutopilotModal>`.
- On success: `queryClient.invalidateQueries({ queryKey: ['project-autopilots', projectId] })`.
- Wrap in `useMutation` from TanStack Query.

---

## Wave 5: Frontend — Toggle & Polish

### Task 5.1 — Wire toggle on AutopilotCard
**File (MODIFY):** `ui-v1/src/components/Autopilot/AutopilotCard.tsx`

- Accept `onToggle?: (id: string, isActive: boolean) => void` prop.
- Make the `ToggleLeft`/`ToggleRight` button clickable (remove `cursor-default`).
- On click → `onToggle?.(autopilot.id, !isActive)`.

### Task 5.2 — Wire toggle mutation in AutopilotDashboardView
**File (MODIFY):** `ui-v1/src/components/Autopilot/AutopilotDashboardView.tsx`

- `useMutation` for `autopilotApi.toggleAutopilot(id, isActive)`.
- On success: optimistic update via `queryClient.setQueryData` for instant feedback.
- Pass `onToggle` down through `<AutopilotList>` → `<AutopilotCard>`.

### Task 5.3 — Update AutopilotList to pass toggle down
**File (MODIFY):** `ui-v1/src/components/Autopilot/AutopilotList.tsx`

- Accept `onToggle?: (id: string, isActive: boolean) => void`.
- Pass to each `<AutopilotCard>`.

### Task 5.4 — Framer Motion page entrance animation
**File (MODIFY):** `ui-v1/src/components/Autopilot/AutopilotDashboardView.tsx`

- Wrap the card grid in `<motion.div>` with `staggerChildren`.
- Each `AutopilotCard`'s wrapping element gets `variants` for fade-in-up on mount.
- Header animates in from top: `initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}`.

---

## Verification UAT

| # | Check | How to verify |
|---|-------|---------------|
| 1 | "New Autopilot" button opens 4-step modal | Click button on dashboard |
| 2 | Trigger step requires ≥1 selection | Try to advance with none selected |
| 3 | Condition step shows editable XYFlow canvas | Step 2 of modal |
| 4 | Action step shows editable pipeline editor | Step 3 of modal |
| 5 | "Create Autopilot" fires mutation, card appears | Complete modal |
| 6 | Toggle fires mutation, icon flips optimistically | Click toggle on card |
| 7 | Page entrance animation staggers cards on load | Refresh the autopilot tab |
| 8 | No TypeScript errors | `bun tsc --noEmit` in both `ui-v1` and `modular-monolith` |
