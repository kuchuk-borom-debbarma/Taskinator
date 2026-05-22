# Registry & Dynamic Template Generation

This document details how the central `AutoActionRegistry` manages triggers, actions, and conditions, and dynamically serializes Zod schemas to build complete catalog templates for specific entity scopes.

---

## 1. The central `AutoActionRegistry`

The `AutoActionRegistry` acts as the single source of truth for the entire automation engine. It stores and catalogs all available triggers, actions, and condition definitions across all scopes, completely decoupling the core execution engines from domain-specific rules.

### Thread-Safe Registry Storage
All definitions are stored in private `Map` properties within the registry:

```typescript
export class AutoActionRegistry {
    private readonly triggers = new Map<string, TriggerDefinition>();
    private readonly actions = new Map<string, ActionDefinition<any>>();
    private readonly conditions = new Map<string, ConditionDefinition<any>>();
    ...
}
```

---

## 2. Dynamic Template Serialization

To support fully dynamic rule editors in user interfaces, the registry generates a comprehensive metadata template for any requested scope (e.g. `getTemplateForScope(EntityScope.TASK)`).

This allows the user interface to know exactly what triggers, actions, and conditions are supported and what inputs they expect, without hardcoding any form layouts on the frontend.

### Serializing Zod Schemas
Since raw TypeScript Zod schemas cannot be sent across network APIs to a browser or external client, the module includes a custom, recursive Zod-to-JSON-Schema converter in [template.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/auto-action/template.ts).

The serializer converts raw Zod types into an easy-to-consume JSON schema catalog format:
* `ZodEnum` -> `{ type: 'enum', options: [...] }`
* `ZodString` -> `{ type: 'string' }`
* `ZodNumber` -> `{ type: 'number' }`
* `ZodBoolean` -> `{ type: 'boolean' }`
* `ZodObject` -> Maps child properties recursively, capturing each property's type and `required` state.
* `ZodEffects`/`ZodNullable` -> Strips outer wrappers and serializes the underlying core type.

---

## 3. Dynamic Template Schema Format

The resulting template catalog payload returned by `getTemplateForScope` contains four key elements:

```json
{
  "triggers": [
    {
      "type": "task.updated",
      "name": "Task Updated",
      "description": "Fires when a task is modified."
    }
  ],
  "actions": [
    {
      "type": "SetFields",
      "name": "Set Fields",
      "description": "Updates standard fields and assignments on a task.",
      "inputs": {
        "status": {
          "type": "enum",
          "options": ["TODO", "IN_PROGRESS", "DONE"],
          "required": false
        },
        "priority": {
          "type": "number",
          "required": false
        }
      }
    }
  ],
  "contextFields": [
    "taskId",
    "projectId",
    "prev_status",
    "current_status"
  ],
  "conditionTypes": [
    {
      "type": "TaskFieldChangedTo",
      "name": "Task Field Changed To",
      "isSync": true,
      "inputs": {
        "field": {
          "type": "enum",
          "options": ["status", "priority", "title", "version"],
          "required": true
        },
        "to": {
          "type": "unknown",
          "required": true
        }
      }
    }
  ]
}
```

### UI Integration Benefits
By consuming this dynamic template:
1. **Dynamic Forms**: The UI can dynamically render input select fields for `SetFields` actions based on the schema's `options` array.
2. **Logic Builders**: The UI can build nested logical filters (`AND`, `OR`, `NOT`) and dynamically supply selection inputs for condition predicates based on `conditionTypes`.
3. **Instant Validation**: The UI can immediately validate that user configurations match the required schema types before submitting them to the server, preventing database errors.
