# Triggers & Context Resolution

This document details how the automation engine detects system events, bootstraps triggers, and builds the lightweight context records required for stateless condition evaluation.

---

## 1. Triggers Overview

A **Trigger** represents a specific lifecycle hook or event within an entity's domain. When a trigger event occurs, it initiates the evaluation of all automation rules registered under its scope.

### Scope-Bound Triggers
Currently, the automation engine is centered around the `TASK` scope, supporting two core triggers:
* **`task.created`**: Fires when a task is first created in a workspace or project.
* **`task.updated`**: Fires when an existing task's fields, assignments, or metadata change.

---

## 2. Dynamic Trigger Registration

Triggers are registered programmatically in the central registry during module bootstrapping. In [scopes/task/triggers.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/auto-action/scopes/task/triggers.ts), triggers register themselves via `autoActionRegistry.registerTrigger()`:

```typescript
export function registerTriggers(): void {
    autoActionRegistry.registerTrigger({
        type: 'task.created',
        name: 'Task Created',
        description: 'Fires when a new task is created.',
        scope: EntityScope.TASK,
    });

    autoActionRegistry.registerTrigger({
        type: 'task.updated',
        name: 'Task Updated',
        description: 'Fires when a task is modified.',
        scope: EntityScope.TASK,
    });
}
```

---

## 3. Lightweight Context Structure

When a trigger fires, the caller constructs a lightweight context payload matching the `TaskContext` schema. The context acts as a read-only comparison state, eliminating database fetching during condition checks.

### TaskContext Schema (`scopes/task/types.ts`)
The context payload is strongly typed and validated using Zod:

```typescript
export const taskContextSchema = z.object({
    traceId: z.string(),
    scope: z.literal(EntityScope.TASK),
    actorId: z.string(),
    taskId: z.string(),
    projectId: z.string(),
    
    // Previous and Current State Comparison Fields
    prev_status: z.any().nullable().optional(),
    current_status: z.any().nullable().optional(),
    
    prev_priority: z.any().nullable().optional(),
    current_priority: z.any().nullable().optional(),
    
    prev_title: z.any().nullable().optional(),
    current_title: z.any().nullable().optional(),
    
    prev_team_id: z.any().nullable().optional(),
    current_team_id: z.any().nullable().optional(),
    
    prev_member_id: z.any().nullable().optional(),
    current_member_id: z.any().nullable().optional(),
    
    prev_version: z.number().optional(),
    current_version: z.number().optional(),
});
```

---

## 4. Trigger Invocation Flow

When a domain change occurs in the database or service layer:
1. The domain service publishes a local event or directly calls the automation engine.
2. The publisher maps the pre-update and post-update entity records into the `TaskContext` format.
3. The engine invokes the condition evaluator with the compiled context and loops through all active rules bound to the trigger.

```typescript
// Example: Invoking the engine from a Task Service
const context: TaskContext = {
    traceId: request.traceId,
    scope: EntityScope.TASK,
    actorId: session.userId,
    taskId: task.id,
    projectId: task.projectId,
    
    prev_status: oldTask.status,
    current_status: newTask.status,
    
    prev_priority: oldTask.priority,
    current_priority: newTask.priority,
    
    prev_team_id: oldTask.teamId,
    current_team_id: newTask.teamId,
    
    prev_member_id: oldTask.memberId,
    current_member_id: newTask.memberId,
    
    prev_version: oldTask.version,
    current_version: newTask.version,
};

// Dispatch to the automation coordinator
await autoActionEngine.executeTriggers('task.updated', context);
```
