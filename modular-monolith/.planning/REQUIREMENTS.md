# Requirements: Configurable Workspace Behaviors (CWB)

## 1. Functional Requirements

### 1.1 Database Schema (`behavior_rule`)
- Create `behavior_rule` table to store automation logic.
- Fields: `id`, `fk_project_id`, `name`, `is_active`, `behavior_type`, `fk_task_id`, `criteria_field`, `criteria_operator`, `criteria_value`, `action_message`, `action_value`, `version`, `created_at`, `updated_at`.
- Support behaviors: `BLOCKER_RESOLUTION`, `PARENT_DELETE_GUARD`, `PRIORITY_CASCADE`, `TEAM_CASCADE`, `BLOCKER_SAFETY_GUARD`, `MEMBER_ASSIGNMENT_GUARD`, `CASCADE_DELETE`, `AUTO_NOTIFY`.

### 1.2 Pre-Action Guards
- Hook into `TaskService.deleteTask` and `TaskService.updateTask`.
- Synchronous check before DB commit.
- Throw validation error if guard condition fails.
- Specific guards:
    - `PARENT_DELETE_GUARD`: Block if active subtasks exist.
    - `BLOCKER_SAFETY_GUARD`: Block `IN_PROGRESS` if blockers are not complete.
    - `MEMBER_ASSIGNMENT_GUARD`: Block member assignment if team is null.

### 1.3 Post-Action Cascades
- Kafka-driven background execution.
- Listen for `TASK.CREATED` and `TASK.UPDATED`.
- Evaluate criteria using flat field comparison.
- Execute updates via `taskService.updateTask`.
- Specific cascades:
    - `BLOCKER_RESOLUTION`: Transition parent to READY when subtasks COMPLETE.
    - `PRIORITY_CASCADE`: Propagate priority to subtasks.
    - `TEAM_CASCADE`: Propagate team to subtasks.
    - `CASCADE_DELETE`: Delete subtasks on parent deletion.
    - `AUTO_NOTIFY`: Send alerts on dependency resolution.

### 1.4 System Cleanup
- Remove legacy AST-based engines and suspension logic.
- Wipe existing `auto_action` data.

## 2. Non-Functional Requirements
- **Performance:** Direct DB queries for relationship traversals (no recursive app-side logic).
- **Reliability:** "Log and Proceed" for cascades; synchronous rollback for guards.
- **Simplicity:** KISS principle; flat targeting only.

## 3. Testing Requirements
- **E2E Heavy:** Verify guards block transactions and cascades execute via Kafka.
- **Validation:** Ensure legacy code removal doesn't break existing task operations.
