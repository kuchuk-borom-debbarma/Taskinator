# Phase 11 Plan: Visual Condition Builder (XYFlow)

## Goal
Implement a read-write, node-based visual editor for `ConditionTree` structures.
Users can view and build complex AND/OR/NOT + Predicate trees interactively.

## Pre-conditions
- `@xyflow/react` is already installed and used in `TaskGraph.tsx` (precedent established).
- `AutopilotConditionNode` type exists in `AutopilotAPI.ts`.
- The builder will be embedded inside an `AutopilotBuilderView` (full-page for Phase 13).
- For Phase 11, the builder is wired to: load condition from `AutopilotItem`, render it as a graph, and serialize back to JSON on request.

---

## Key Design Decisions

### A — Layout Strategy: Recursive-to-Hierarchical (Dagre-style)
Convert the recursive JSON tree into a flat `nodes[]` + `edges[]` array using a depth-first traversal with computed `x/y` positions. No external layout library needed — a simple column/row offset algorithm is sufficient for condition trees (which are narrow and deep, not wide).

### B — Canvas is Full-Height Embedded (not a route)
The builder renders inside a `div` with `height: 600px` (expandable) rather than a fullscreen route. This enables it to be embedded in the Autopilot Create/Edit modal (Phase 13).

### C — Node Edit via Side Popover (not inline)
Clicking a `PredicateNode` opens a floating popover panel (right side of canvas) for editing fields. This avoids complex inline editing inside XYFlow nodes.

---

## Wave 1: Types & Serialization Logic

### Task 1.1 — Define ConditionBuilderNode types
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/types.ts`

- `LogicalNodeData`: `{ logicalType: 'and' | 'or' | 'not' }`
- `PredicateNodeData`: `{ domain: string; field: string; operator: string; value: string }`
- `ConditionBuilderNodeType = 'logicalNode' | 'predicateNode'`

### Task 1.2 — Tree → Graph serializer
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/treeSerializer.ts`

```ts
export function conditionTreeToGraph(root: AutopilotConditionNode): { nodes: Node[], edges: Edge[] }
```

- DFS traversal, assigns unique node IDs (`node-${depth}-${index}`).
- Positions: `x = depth * 260`, `y = siblingIndex * 140`.
- `logicalNode` type for AND/OR/NOT; `predicateNode` for leaf predicates.
- Creates directed edge from parent to each child.

### Task 1.3 — Graph → Tree deserializer
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/treeDeserializer.ts`

```ts
export function graphToConditionTree(nodes: Node[], edges: Edge[], rootId: string): AutopilotConditionNode
```

- Builds adjacency list from edges.
- Recursive reconstruction starting from `rootId`.

---

## Wave 2: XYFlow Custom Nodes

### Task 2.1 — LogicalNode (AND/OR/NOT)
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/LogicalNode.tsx`

- `memo`-wrapped XYFlow node component.
- Pill badge: **AND** (teal `bg-app-accent-2-soft text-app-accent-2`), **OR** (orange accent), **NOT** (red `bg-app-danger/10 text-app-danger`).
- Handles: `source` bottom, `target` top.
- Clicking the badge cycles through AND → OR → NOT (calls `onTypeChange` callback via `data.onTypeChange`).

### Task 2.2 — PredicateNode
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/PredicateNode.tsx`

- `memo`-wrapped XYFlow node.
- Shows domain/field/operator/value in a compact read-only card (`surface-card rounded-xl`).
- On click: highlights and calls `data.onSelect(id)` to open the side editor panel.
- Handle: `target` top only (leaf node, no children).

---

## Wave 3: Canvas & Editor

### Task 3.1 — ConditionBuilder Canvas
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/ConditionBuilderCanvas.tsx`

```tsx
interface ConditionBuilderCanvasProps {
  initialCondition: AutopilotConditionNode;
  onChange?: (condition: AutopilotConditionNode) => void;
  readOnly?: boolean;
}
```

- Uses `useNodesState` / `useEdgesState` from XYFlow.
- Registers `nodeTypes = { logicalNode: LogicalNode, predicateNode: PredicateNode }`.
- On mount: calls `conditionTreeToGraph` to initialise nodes/edges.
- Tracks selected predicate node → shows `PredicateEditorPanel` (Task 3.2).
- Toolbar (top of canvas): "Add AND", "Add OR", "Add Predicate" buttons.
- `<Background>` with subtle dot grid, `<Controls>` for zoom/fit.
- Canvas theme: light glassmorphism (not dark like TaskGraph — matches app aesthetic).

### Task 3.2 — PredicateEditorPanel (Floating Side Panel)
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/PredicateEditorPanel.tsx`

- Absolute-positioned panel (right side of canvas container).
- Contains four fields:
  1. **Domain**: dropdown → `task` / `project` (static for Phase 11).
  2. **Field**: dropdown, dynamic based on domain:
     - `task`: `status`, `priority`, `title`
     - `project`: `name`
  3. **Operator**: dropdown → `==`, `!=`, `>`, `<`, `contains`
  4. **Value**: `SmartValueInput` (see Task 3.3).
- "Apply" button → updates the XYFlow node data and fires `onChange`.
- "Remove" button → deletes the node and its edge from the graph.

### Task 3.3 — SmartValueInput
**File (NEW):** `ui-v1/src/components/Autopilot/Builder/SmartValueInput.tsx`

Renders the correct input based on `domain + field`:
- `task.status` → Dropdown (`TODO`, `IN_PROGRESS`, `DONE`) + "Other..." → text fallback.
- `task.priority` → Dropdown (`1 Urgent`, `2 High`, `3 Medium`, `4 Low`).
- Everything else → plain text `<input>`.

---

## Wave 4: Integration into AutopilotCard

### Task 4.1 — Wire ConditionBuilderCanvas into AutopilotDashboardView
**File (MODIFY):** `ui-v1/src/components/Autopilot/AutopilotCard.tsx`

- Add a "View Conditions" expand button (chevron) to the card footer.
- When expanded: renders `<ConditionBuilderCanvas readOnly initialCondition={autopilot.conditions} />` below the card content in a `<motion.div>` expand animation.
- Height constrained to `320px` for card context.

---

## Verification UAT

| # | Check | How to verify |
|---|-------|---------------|
| 1 | Condition tree renders as graph for existing autopilots | Expand card with seeded data |
| 2 | AND/OR/NOT nodes show correct colour badges | Visual check |
| 3 | Predicate nodes show domain/field/operator/value | Visual check |
| 4 | Clicking predicate opens editor panel | Interact with PredicateNode |
| 5 | SmartValueInput renders dropdown for `task.status` | Set domain=task, field=status |
| 6 | "Other..." selects text fallback | Click "Other..." in value dropdown |
| 7 | `graphToConditionTree` round-trips correctly | Console log serialized JSON |
| 8 | No TypeScript errors | `bun tsc --noEmit` in `ui-v1` |
