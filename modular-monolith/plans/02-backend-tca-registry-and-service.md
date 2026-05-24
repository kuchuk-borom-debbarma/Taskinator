# Plan 02: Backend TCA Registry & Service Layer

This plan details the backend Trigger-Condition-Action (TCA) execution registry, the synchronous pre-commit guard validations, and the asynchronous event-driven status cascades in the task domain.

---

## 🛠️ 1. Declarative TCA Registry

We will create a unified registry file that maps Enum string keys directly to TypeScript logic callbacks. This completely avoids dynamic AST code evaluations.

#### [NEW] [AutomationRegistry.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/task/internal/AutomationRegistry.ts)
```typescript
import { db } from '../../../infra/database/index.ts';
import type { Task } from '../TaskService.ts';

// 1. Conditions Dictionary
export const AUTOMATION_CONDITIONS = {
    IS_BLOCKED: async (task: Task): Promise<boolean> => {
        // Checks task_reachability to verify if at least one prerequisite is incomplete
        const blockers = await db
            .selectFrom('task_reachability')
            .innerJoin('project_task', 'project_task.id', 'task_reachability.ancestor_task_id')
            .select('project_task.id')
            .where('task_reachability.descendant_task_id', '=', task.id)
            .where('project_task.status', '!=', 'DONE')
            .execute();
        return blockers.length > 0;
    },
    
    ALL_PREREQUISITES_DONE: async (task: Task): Promise<boolean> => {
        const blockers = await db
            .selectFrom('task_reachability')
            .innerJoin('project_task', 'project_task.id', 'task_reachability.ancestor_task_id')
            .select('project_task.id')
            .where('task_reachability.descendant_task_id', '=', task.id)
            .where('project_task.status', '!=', 'DONE')
            .execute();
        return blockers.length === 0;
    },
    
    HAS_NO_ASSIGNEE: async (task: Task): Promise<boolean> => {
        return !task.memberId;
    },
    
    TAG_CONTAINS: async (task: Task, value: string): Promise<boolean> => {
        // Tag checking logic if tags are implemented
        return false; 
    }
};

// 2. Actions Dictionary
export const AUTOMATION_ACTIONS = {
    SET_STATUS: async (task: Task, value: string, ctx: { actorId: string; taskService: any }): Promise<void> => {
        // Invokes the standard task update flow to fire outbox events and rebuild counters
        await ctx.taskService.updateTask({
            actorId: ctx.actorId,
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            status: value
        });
    },
    
    SET_ASSIGNEE_TO_ACTOR: async (task: Task, _value: string, ctx: { actorId: string; taskService: any }): Promise<void> => {
        await ctx.taskService.updateTask({
            actorId: ctx.actorId,
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            memberId: ctx.actorId
        });
    },
    
    REJECT_TRANSITION: async (task: Task, value: string, ctx: { isSync: boolean }): Promise<void> => {
        if (ctx.isSync) {
            throw new Error(value || 'Transition blocked by automation policy.');
        }
    }
};
```

---

## ⚡ 2. Synchronous Pre-Commit Guards

Pre-Commit Guards validate actions synchronously inside the HTTP request-response cycle before any database transaction commits.

### Integration in Task Update
#### [MODIFY] [TaskServiceImpl.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/task/internal/TaskServiceImpl.ts)
We inject synchronous rule checks right at the start of the `updateTask` method:

```typescript
import { AUTOMATION_CONDITIONS, AUTOMATION_ACTIONS } from './AutomationRegistry.ts';

// Inside TaskServiceImpl.updateTask:
async updateTask(param: { ... }): Promise<Task> {
    // 1. Fetch current task state
    const currentTask = await getTaskById(param.taskId);
    if (!currentTask) throw new Error('Task not found');
    
    // 2. Load active synchronous rules for status transition
    if (param.status && param.status !== currentTask.status) {
        const syncRules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', param.projectId)
            .where('trigger_type', '=', 'TASK_STATUS_CHANGED')
            .where('trigger_value', '=', param.status)
            .where('is_active', '=', true)
            .where('is_sync', '=', true)
            .execute();
            
        for (const rule of syncRules) {
            // Evaluate condition
            const conditionFn = AUTOMATION_CONDITIONS[rule.condition_type as keyof typeof AUTOMATION_CONDITIONS];
            const actionFn = AUTOMATION_ACTIONS[rule.action_type as keyof typeof AUTOMATION_ACTIONS];
            
            if (conditionFn && actionFn) {
                const isMet = await conditionFn(currentTask, rule.condition_value);
                if (isMet) {
                    // Synchronously block the transaction
                    await actionFn(currentTask, rule.action_value || '', { isSync: true });
                }
            }
        }
    }
    
    // 3. Proceed with DB update
    const result = await updateTask(param);
    return result;
}
```

---

## 🔄 3. Asynchronous Post-Commit Cascades

Post-Commit Cascades process work event-driven in the background, keeping the HTTP cycle extremely fast.

### Kafka Listener Configuration
#### [NEW] [TaskAutomationListener.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/task/internal/listeners/TaskAutomationListener.ts)
We create a background event listener that receives Kafka outbox events.

1. When a task transitions to `DONE`, it generates a `task.updated` event.
2. The listener catches `task.updated`.
3. It queries the `task_reachability` index to find all downstream tasks blocked by this task:
   ```typescript
   const downstreamTasks = await getReachabilityDescendants(taskId);
   ```
4. For each downstream task, it checks for active async rules (like `PREREQUISITE_COMPLETED`).
5. It evaluates the `ALL_PREREQUISITES_DONE` condition.
6. If met, it executes `ACTIONS.SET_STATUS(Task, 'READY')` recursively.

### Registry Hook
#### [MODIFY] [registry.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/infra/kafka/registry.ts)
Register `TaskAutomationListener` as an active consumer group so it boots up when Express listener starts.
