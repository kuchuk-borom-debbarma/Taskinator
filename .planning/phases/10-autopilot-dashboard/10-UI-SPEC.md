# UI Specification: Autopilot Dashboard & Navigation
**Phase:** 10

## Objective
Provide a dedicated entry point for Autopilot management within a project and a list view to manage existing automation rules.

## Design System & Brand
- **Aesthetics**: Follow the existing "Taskinator Glassmorphism" style.
- **Colors**:
    - Primary Accent: `--color-app-accent` (#ff6a3d) - used for "Auto" related actions.
    - Status Indicators: `--color-app-success` (Active), `--color-app-neutral` (Inactive).
- **Typography**: "Avenir Next" / Sans-serif.
- **Icons**: Lucide React (`Zap`, `ToggleLeft`, `ToggleRight`, `MoreVertical`, `Plus`).

## Navigation Changes
### Project Layout (`ProjectLayout.tsx`)
- **Menu Item**: Add "Autopilot" to `navItems`.
- **Icon**: `Zap`.
- **Route**: `/projects/$projectId/autopilot`.

## Views & Components

### 1. `AutopilotDashboardView` (Page Component)
- **Header**: Standard project sub-page header with "Autopilot" title.
- **Action Bar**: "New Autopilot" button (Accent color).
- **Content**: `AutopilotList` component.

### 2. `AutopilotList` (Container)
- Displays a grid or list of `AutopilotCard` components.
- **Empty State**: Use a "WOW" graphic (e.g., a pulsing `Zap` icon) with a clear CTA to "Build your first automation".

### 3. `AutopilotCard` (Item Component)
- **Visual Style**: `surface-card` with hover lift effect.
- **Content**:
    - **Title**: Autopilot name (or ID if name is missing).
    - **Triggers**: Badge list of events (e.g., `task.updated`).
    - **Status**: Toggle switch (Active/Inactive).
    - **Summary**: Brief text of the condition (e.g., "status == IN_PROGRESS").

## Data Flow (GraphQL)

### Queries
- `GetProjectAutopilots(projectId: ID!)`: Retrieves all autopilots for the project.

### Mutations
- `ToggleAutopilotStatus(id: ID!, isActive: Boolean!)`: Instant toggle from the list view.

## Interaction Details
- **Hover**: Cards should slightly scale and increase shadow on hover.
- **Toggle**: Use a smooth Framer Motion transition for the status toggle.
- **Navigation**: Clicking a card navigates to the builder view (Phase 11).
