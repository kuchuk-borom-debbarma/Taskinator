# Phase 12 Plan: Action Pipeline & Dynamic Forms

## Goal
Build a sequential action pipeline editor that lets users compose, reorder, and configure the ordered list of `AutopilotAction` steps. Each action type maps to a smart config form with predefined dropdowns and "Other..." text fallbacks (same pattern as `SmartValueInput` from Phase 11).

## Supported Action Types (from ActionHandlers.ts)

| Action key | Config fields | Smart input |
|---|---|---|
| `task.update_status` | `status` | Dropdown: TODO / IN_PROGRESS / DONE + Other |
| `task.update_priority` | `priority` | Dropdown: 1 Urgent / 2 High / 3 Medium / 4 Low + Other |
| `task.assign_team` | `teamId` | Text input (ID) |
| `task.assign_member` | `memberId` | Text input (ID) |
| `task.unassign_team` | _(none)_ | No config needed |
| `task.unassign_member` | _(none)_ | No config needed |

## Pre-conditions
- `AutopilotItem.actions: AutopilotAction[]` is available from the GraphQL query.
- `SmartValueInput` from Phase 11 handles status/priority dropdowns already.
- Phase 13 will wire mutations — this phase builds only the **read-only display + editable draft state**.

---

## Wave 1: Action Type Registry

### Task 1.1 — Action type definitions
**File (NEW):** `ui-v1/src/components/Autopilot/Pipeline/actionTypes.ts`

```ts
export interface ActionTypeDefinition {
  key: string;                     // e.g. 'task.update_status'
  label: string;                   // e.g. 'Update Status'
  description: string;
  configFields: ActionConfigField[];
}

export interface ActionConfigField {
  key: string;              // e.g. 'status'
  label: string;
  inputType: 'text' | 'status-select' | 'priority-select' | 'none';
}
```

Populate `ACTION_TYPE_REGISTRY: ActionTypeDefinition[]` with all 6 types.

---

## Wave 2: Pipeline Components

### Task 2.1 — ActionStepCard
**File (NEW):** `ui-v1/src/components/Autopilot/Pipeline/ActionStepCard.tsx`

A single step in the pipeline. Displays:
- **Position badge**: `1`, `2`, `3` etc. (orange/accent circle).
- **Action label**: from registry, e.g. "Update Status".
- **Config summary**: key=value monospace, e.g. `status = DONE`.
- **Drag handle** (visual only for Phase 12 — `GripVertical` icon).
- **Edit / Remove** buttons (calls `onEdit(index)` / `onRemove(index)` callbacks).

Design: `surface-card rounded-[16px] px-4 py-3`, left border accent stripe.

### Task 2.2 — ActionConfigForm
**File (NEW):** `ui-v1/src/components/Autopilot/Pipeline/ActionConfigForm.tsx`

Per-action config editor. Receives `ActionTypeDefinition + currentConfig`.

For each `configField`:
- `status-select`: Dropdown (TODO/IN_PROGRESS/DONE) + "Other..." → text
- `priority-select`: Dropdown (1–4) + "Other..." → text
- `text`: plain `<input>`
- `none`: renders "No configuration required" hint

Returns updated `config` on submit.

### Task 2.3 — AddActionModal
**File (NEW):** `ui-v1/src/components/Autopilot/Pipeline/AddActionModal.tsx`

Uses existing `AppModal` from `shared/workspace`.

Step 1 — Action type picker:
- Grid of action type cards (2 columns).
- Each card: icon + label + description.
- On select → advance to Step 2.

Step 2 — Config form:
- Renders `ActionConfigForm` for the chosen type.
- "Add" button → calls `onAdd({ type, config, position })`.

### Task 2.4 — ActionPipelineEditor (Container)
**File (NEW):** `ui-v1/src/components/Autopilot/Pipeline/ActionPipelineEditor.tsx`

```tsx
interface ActionPipelineEditorProps {
  actions: AutopilotAction[];
  readOnly?: boolean;
  onChange?: (actions: AutopilotAction[]) => void;
}
```

- Renders ordered list of `<ActionStepCard>` items.
- "Add Action" button at the bottom (opens `AddActionModal`).
- When `readOnly=true`: hides Add/Edit/Remove buttons, shows arrow connectors between steps.
- Step connector: simple vertical dashed line between cards + `→` label.
- Empty state: "No actions configured" with a `Play` icon.

---

## Wave 3: Integrate into AutopilotCard

### Task 3.1 — Add "View Pipeline" expand to AutopilotCard
**File (MODIFY):** `ui-v1/src/components/Autopilot/AutopilotCard.tsx`

- Add second expand toggle: "View Pipeline" (uses `ListChecks` icon, already imported).
- When expanded: renders `<ActionPipelineEditor readOnly actions={autopilot.actions} />` in a `<motion.div>` with `height: 260px` expand animation.
- Both "View Conditions" and "View Pipeline" can be open simultaneously (independent state).

---

## Verification UAT

| # | Check | How to verify |
|---|-------|---------------|
| 1 | All 6 action types appear in the Add Action modal | Open modal, inspect grid |
| 2 | `task.update_status` shows status dropdown | Select action type, check form |
| 3 | "Other..." in status dropdown reveals text input | Click "Other..." |
| 4 | `task.unassign_team` shows "No config required" | Select action type |
| 5 | Action cards show position badge + config summary | View seeded autopilot pipeline |
| 6 | Step connectors render between cards in read-only mode | Expand "View Pipeline" on a card |
| 7 | No TypeScript errors | `bun tsc --noEmit` in `ui-v1` |
