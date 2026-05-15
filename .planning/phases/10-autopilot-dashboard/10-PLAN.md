# Phase 10 Plan: Autopilot Dashboard & Navigation

## Goal
Add a fully functional Autopilot list view to the existing project layout, wired to the new `autopilots` GraphQL query. Users can view all automations for a project, see their status, and toggle them on/off.

## Pre-conditions
- `autopilots(projectId, ...)` GraphQL query is live (✅ done).
- `ui-v1` uses: React 19, TanStack Router, TanStack Query, Tailwind v4, Framer Motion, Lucide React.
- API layer pattern: `GraphQL*API` adapter → `*API` interface → `ApiContext` → `useApi()` hook.

---

## Wave 1: API Layer

### Task 1.1 — Define AutopilotAPI Interface
**File (NEW):** `ui-v1/src/api/interfaces/AutopilotAPI.ts`

```ts
export interface AutopilotConditionNode { /* ... recursive */ }
export interface AutopilotAction { id: string; type: string; config: Record<string, any>; position: number; }
export interface AutopilotItem { id: string; fk_project_id: string; triggers: string[]; conditions: AutopilotConditionNode; isActive: boolean; actions: AutopilotAction[]; createdAt: string; version: number; }
export interface AutopilotPage { autopilots: AutopilotItem[]; totalCount: number; pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null; }; }

export interface AutopilotAPI {
  getProjectAutopilots(projectId: string, pagination?: { first?: number; after?: string }): Promise<AutopilotPage>;
}
```

### Task 1.2 — Implement GraphQLAutopilotAPI
**File (NEW):** `ui-v1/src/api/adapters/graphql/GraphQLAutopilotAPI.ts`

- Copy constructor + `query<T>()` helper from `GraphQLProjectAPI`.
- Implement `getProjectAutopilots` using the `autopilots(...)` connection query.
- Map edges to `AutopilotItem[]`.

### Task 1.3 — Register in ApiContext
**File (MODIFY):** `ui-v1/src/context/ApiContext.tsx`

- Import `AutopilotAPI`, `GraphQLAutopilotAPI`.
- Add `autopilotApi: AutopilotAPI` to `ApiContextType`.
- Instantiate `GraphQLAutopilotAPI` in the `useMemo` block.

---

## Wave 2: Route & Navigation

### Task 2.1 — Add "Autopilot" nav tab to ProjectLayout
**File (MODIFY):** `ui-v1/src/components/Project/ProjectLayout.tsx`

- Import `Zap` from `lucide-react`.
- Add to `navItems`:
  ```ts
  { label: 'Autopilot', icon: Zap, to: '/projects/$projectId/autopilot' }
  ```

### Task 2.2 — Add route to router
**File (MODIFY):** `ui-v1/src/router.tsx`

- Create `projectAutopilotRoute`:
  ```ts
  const projectAutopilotRoute = createRoute({
    getParentRoute: () => projectLayoutRoute,
    path: 'autopilot',
    component: lazyRouteComponent(() => import('./components/Autopilot/AutopilotDashboardView')),
  });
  ```
- Add to `projectLayoutRoute.addChildren([...])`.

---

## Wave 3: UI Components

### Task 3.1 — AutopilotDashboardView (Page)
**File (NEW):** `ui-v1/src/components/Autopilot/AutopilotDashboardView.tsx`

- Uses `useParams({ from: '/authenticated-layout/projects/$projectId' })`.
- Uses `useQuery` with `autopilotApi.getProjectAutopilots(projectId, { first: 20 })`.
- Renders:
  - **Header**: `<h1>` "Autopilot" + "New Autopilot" button (disabled for now, Phase 11+).
  - **Loading state**: skeleton cards (3 × pulse).
  - **Empty state**: `<ZapEmptyState />`.
  - **List**: `<AutopilotList>` with autopilots.

### Task 3.2 — AutopilotList (Container)
**File (NEW):** `ui-v1/src/components/Autopilot/AutopilotList.tsx`

- Receives `autopilots: AutopilotItem[]` as props.
- Renders a responsive grid: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`.
- Maps over items and renders `<AutopilotCard>` for each.

### Task 3.3 — AutopilotCard (Item)
**File (NEW):** `ui-v1/src/components/Autopilot/AutopilotCard.tsx`

Design (`surface-card` + hover lift):
```tsx
<motion.div whileHover={{ y: -2 }} className="surface-card rounded-[20px] p-5 cursor-pointer">
  {/* Header: status indicator dot + triggers badges */}
  {/* Body: condition summary text */}
  {/* Footer: createdAt + action count + isActive toggle */}
</motion.div>
```

- **Status dot**: `bg-app-success` if active, `bg-app-neutral` if not.
- **Trigger badges**: each `trigger` → pill badge (`bg-app-accent-soft text-app-accent`).
- **Condition summary**: stringify first predicate leaf (e.g. `"status == IN_PROGRESS"`).
- **Toggle**: Lucide `ToggleLeft`/`ToggleRight` — fires no mutation for now (Phase 13).
- **Action count**: small badge, e.g. `3 actions`.

### Task 3.4 — ZapEmptyState (Shared)
**File (NEW):** `ui-v1/src/components/Autopilot/ZapEmptyState.tsx`

- Animated `Zap` icon (Framer Motion `animate={{ scale: [1, 1.15, 1] }}` pulse).
- Heading: "No automations yet".
- Sub: "Build your first autopilot to automate repetitive tasks."
- CTA button: "Create Autopilot" (disabled, will wire in Phase 11+).

---

## Verification UAT

| # | Check | How to verify |
|---|-------|---------------|
| 1 | "Autopilot" tab appears in all project sub-navs | Navigate to any project |
| 2 | Empty state renders for projects with no autopilots | Use a fresh project |
| 3 | Cards render with triggers, status dot, action count | Use seeded autopilot from backend tests |
| 4 | Hover lift animation plays smoothly | Mouse over card |
| 5 | Loading skeleton shows while fetching | Throttle network in DevTools |
| 6 | No TypeScript errors | Run `bun tsc --noEmit` in `ui-v1` |
