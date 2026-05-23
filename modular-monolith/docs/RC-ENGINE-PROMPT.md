# Prompt: Implement Configurable Workspace Behaviors (CWB) Automation

Implement a clean, elegant, and radically simplified automation system for Taskinator. This completely replaces the old, complex AST sequential pipeline, condition registries, and step-suspension checks with the **Configurable Workspace Behaviors (CWB)** engine. 

The system must remain 100% configurable by the user per project, per task, or per flat criteria, while keeping the code size minimal and execution blazing fast.

---

## 🎯 Architectural Principles

1.  **KISS (Keep It Stupidly Simple):** Wipe out all nested JSON AST logical operators (`AND`, `OR`, `NOT`), condition splitting, step cursors, and lazy Zod schema compilers.
2.  **Flat Targeting:** Represent rule filtering and targeting using flat, simple columns in a single database table—no recursive trees.
3.  **Direct DB Queries:** Delegate relationship traversals (like parent-child links or blockers in DAGs) directly to highly optimized, indexed Kysely database queries.
4.  **Domain Event Native:** Execute cascading updates by calling public service methods (`taskService.updateTask(...)`), ensuring Optimistic Concurrency Control (OCC) versioning, outbox event generation, and Kafka event emissions occur out-of-the-box.

---

## 🗃️ Database Schema: The `behavior_rule` Table

Create this single, clean table representing rules. It completely replaces the old `auto_action` schema:

```typescript
export interface BehaviorRuleTable {
    id: Generated<string>;
    fk_project_id: string;
    name: string;
    is_active: Generated<boolean>;
    
    // Fixed Smart Behavior Type
    behavior_type: 'BLOCKER_RESOLUTION' | 'PARENT_DELETE_GUARD' | 'PRIORITY_CASCADE' | 'TEAM_CASCADE';
    
    // 1. Targeting by Specific Task (Optional override)
    fk_task_id: string | null;         
    
    // 2. Targeting by Flat Criteria (Optional filter)
    criteria_field: string | null;     // e.g. 'priority', 'status', 'title'
    criteria_operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | null;
    criteria_value: string | null;     // e.g. '5', 'IN_PROGRESS', 'Urgent'
    
    // Action Configuration
    action_message: string | null;    // e.g. Custom rejection message for guards
    action_value: string | null;      // e.g. Target status or priority for cascades
    
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}
```

---

## 🗂️ Component Catalog for the CWB System

Implement these core, high-value smart behaviors exactly as specified. This catalog acts as the exhaustive list of automations. Each behavior is highly customizable per project, per task, and per specific flat criteria using the table columns.

### 1. 🛡️ Pre-Action Guards (Preventive Rules)

These run synchronously inside the database transaction *before* an update or deletion is committed. If the relationship constraint fails, it throws a validation error and aborts/rolls back the request.

*   **`PARENT_DELETE_GUARD`**:
    *   *User-facing Name:* "Prevent deletion if subtasks are active"
    *   *Description:* "Blocks deleting a task if any of its descendant subtasks in the graph are active."
    *   *Customizability Options:*
        *   `criteria`: Filter which parent tasks are subject to this guard (e.g. *only block deletion if parent task priority > 3*).
        *   `fk_task_id`: Task-specific override to apply this guard to a single, critical task.
        *   `action_message`: Custom error message shown to the user (e.g. *"Cannot delete task: some descendant tasks are not COMPLETE."*).
*   **`BLOCKER_SAFETY_GUARD`**:
    *   *User-facing Name:* "Prevent starting task with active blockers"
    *   *Description:* "Blocks updating a task status to `IN_PROGRESS` if any ancestral blocker tasks in the DAG are not complete."
    *   *Customizability Options:*
        *   `criteria`: e.g. *only enforce safety for High-priority tasks (priority >= 4)*.
        *   `action_message`: Custom error message (e.g. *"Cannot start task: some blocker tasks are still active."*).
*   **`MEMBER_ASSIGNMENT_GUARD`**:
    *   *User-facing Name:* "Prevent member assignment without team assignment"
    *   *Description:* "Blocks assigning a team member to a task if the task's assigned `teamId` is null."
    *   *Customizability Options:*
        *   `criteria`: e.g. *only enforce this for specific projects or task types*.
        *   `action_message`: Custom error message (e.g. *"Task must be assigned to a Team before assigning individual members."*).

---

### 2. 🌊 Post-Action Cascades (Reactive Rules)

These execute in the background (via Kafka consumers or lightweight sync lifecycle hooks) *after* an operation completes successfully. They traverse relations and run updates by calling public service methods (`taskService.updateTask(...)`), naturally triggering other downstream events.

*   **`BLOCKER_RESOLUTION`**:
    *   *User-facing Name:* "Auto-resolve blocker when subtasks are complete"
    *   *Description:* "Automatically transitions an ancestor/parent task status from BLOCKED to READY when all its descendant subtasks are COMPLETE."
    *   *Customizability Options:*
        *   `criteria`: Filter which completed subtask triggers this rule (e.g. *only trigger when a Critical subtask completes*).
        *   `action_value`: The target status to apply to the parent task (e.g. transition to `READY`, `TODO`, or `IN_PROGRESS`).
*   **`PRIORITY_CASCADE`**:
    *   *User-facing Name:* "Cascade priority to direct subtasks"
    *   *Description:* "Automatically escalates or modifies the priority of direct subtasks when the parent task's priority changes."
    *   *Customizability Options:*
        *   `criteria`: Filter which parent priority change triggers the cascade (e.g. *only cascade when parent priority changes to 5 (Critical)*).
        *   `action_value`: The absolute priority to set on subtasks (e.g. set all to High/4) or copy the parent's priority directly.
*   **`TEAM_CASCADE`**:
    *   *User-facing Name:* "Cascade team assignment to direct subtasks"
    *   *Description:* "Automatically updates the team assignment of direct subtasks when the parent task's assigned team changes."
    *   *Customizability Options:*
        *   `criteria`: e.g. *only cascade team when parent is assigned to Team A*.
        *   `action_value`: Clear subtask team assignment, copy parent's team assignment, or assign to a specific configured team ID.
*   **`CASCADE_DELETE`**:
    *   *User-facing Name:* "Cascade deletion to subtasks"
    *   *Description:* "Automatically deletes all descendant subtasks when a parent task is deleted."
    *   *Customizability Options:*
        *   `criteria`: e.g. *only cascade delete for parent tasks marked as 'Draft' or status 'ARCHIVED'*.
*   **`AUTO_NOTIFY`**:
    *   *User-facing Name:* "Alert assignee on dependency resolution"
    *   *Description:* "Sends an internal alert to a task assignee when their blocker tasks are fully completed."
    *   *Customizability Options:*
        *   `criteria`: e.g. *only trigger when a task transitions to READY*.
        *   `action_message`: Dynamic notification template text (e.g. *"Task {{task.title}} has no more blockers and is now READY!"*).

---

## 📋 Steps to Implement

### Step 1: Pre-Action Guard Hooks in `TaskService`
Introduce a simple synchronous pre-action hook pipeline directly in `TaskServiceImpl.ts`:
*   Add a simple check inside `deleteTask` and `updateTask` methods.
*   Fetch active `PARENT_DELETE_GUARD` rules for the project.
*   Run the check query and throw a clean validation error if active subtasks exist, immediately blocking the delete/update operation and rolling back the transaction.

### Step 2: Post-Event Cascade Consumer
Refactor the background consumer `AutoActionTaskEventConsumer.ts`:
*   Listen for `KAFKA_EVENTS.TASK.UPDATED` and `KAFKA_EVENTS.TASK.CREATED`.
*   Fetch active cascading rules (`BLOCKER_RESOLUTION`, `PRIORITY_CASCADE`, `TEAM_CASCADE`) for the project.
*   Evaluate the simple criteria (e.g. check if `task.priority` matches the rule's criteria) using a clean helper:
    ```typescript
    function matchesCriteria(task: any, rule: any): boolean {
        if (!rule.criteria_field) return true;
        const value = task[rule.criteria_field];
        if (rule.criteria_operator === 'EQUALS') return String(value) === rule.criteria_value;
        if (rule.criteria_operator === 'NOT_EQUALS') return String(value) !== rule.criteria_value;
        if (rule.criteria_operator === 'GREATER_THAN') return Number(value) > Number(rule.criteria_value);
        if (rule.criteria_operator === 'LESS_THAN') return Number(value) < Number(rule.criteria_value);
        return true;
    }
    ```
*   Execute the direct Kysely queries to find target tasks and run the updates via `taskService.updateTask(...)`.
*   Wrap rule execution in standard try-catch blocks to ensure "Log and Proceed" robustness.

### Step 3: Frontend Template Metadata Catalog
Expose a single service method `getBehaviorSettingsCatalog(projectId: string)` to allow the frontend to easily fetch the active behaviors, their states, and configured criteria. This keeps the UI fully dynamic, rendering checkboxes and filter select boxes instantly without any complex JSON form AST compilers.

### Step 4: Delete Legacy Code Bloat
To restore absolute simplicity, delete the following unused files:
*   `src/modules/auto-action/internal/execution/executor.ts` (Wipe out all step cursors and suspension code).
*   `src/modules/auto-action/internal/engines/conditionEngine.ts` (Wipe out all AST recursive tree evaluators).
*   `src/modules/auto-action/internal/service/validation.ts` (Wipe out sync-safety pipeline validators).
*   Old raw SQL CTE queries in `AutoActionQueries.ts`, refactoring any rule persistence (CRUD) to type-safe Kysely transaction blocks (`db.transaction()`).
