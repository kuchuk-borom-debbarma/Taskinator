# Requirements - UI Integration for Autopilot
**Milestone:** v2.0-ui

## User Stories

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|---------------------|
| US-01 | User | I want to see all my autopilots in a list | - Table/List view showing Name, Status (Active/Inactive), and Trigger types.<br>- Quick toggle for Active/Inactive state. |
| US-02 | User | I want to build conditions visually | - Use XYFlow to represent `AND/OR/NOT` nodes and `Predicate` nodes.<br>- Ability to add/remove/reconnect nodes.<br>- Real-time validation of the tree structure. |
| US-03 | User | I want to configure actions sequentially | - List view for actions with drag-to-reorder support.<br>- Predefined dropdowns for common fields (e.g., Task Status). |
| US-04 | User | I want custom values for action fields | - "Other..." option in dropdowns that reveals a text input field. |

## Technical Requirements

### UI-01: Visual Node Builder (XYFlow)
- **Status:** Pending
- **Goal:** Implement a node-based editor for `ConditionTree`.
- **Constraint:** Must serialize to/from the existing backend JSON schema (`ConditionNode`).

### UI-02: Action Pipeline Editor
- **Status:** Pending
- **Goal:** Sequential list editor for `autopilot_action`.
- **Constraint:** Support `position` management (linked to backend order).

### UI-03: GraphQL Mutations
- **Status:** Pending
- **Goal:** Wire the UI to the backend `createAutopilot` and `updateAutopilot` mutations.

### UI-04: Component Design
- **Status:** Pending
- **Goal:** Premium look and feel using Tailwind v4 and Framer Motion.
