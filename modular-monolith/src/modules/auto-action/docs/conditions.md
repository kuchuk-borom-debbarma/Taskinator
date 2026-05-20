# Condition AST & Modular Predicate Evaluation

This document details the Condition AST structure, the recursive evaluation engine, and the directory-split architecture containing individual condition definitions.

---

## 1. Condition AST Structure

The condition system utilizes an Abstract Syntax Tree (AST) to construct highly complex, nested logical filters. The tree contains two types of nodes:
1. **Logical Group Nodes**: Combine multiple conditions recursively using boolean operations:
   * `AND`: Evaluates to `true` if all child nodes evaluate to `true`.
   * `OR`: Evaluates to `true` if any child node evaluates to `true`.
   * `NOT`: Negates the evaluation of a single child node.
2. **Leaf Predicate Nodes**: Represent hardcoded domain checks (e.g. standard field transitions, team assignments, member changes).

### Zod AST Parser (`types.ts`)
Due to the recursive nature of the logical AST structure, Zod schemas utilize lazy evaluation (`z.lazy`) to parse nested children recursively:

```typescript
export const logicalNodeSchema = z.object({
    type: z.literal('logical'),
    operator: z.enum(['AND', 'OR', 'NOT']),
    children: z.array(z.lazy(() => conditionNodeSchema)),
});
```

---

## 2. Dynamic Evaluation Cycle (`evaluator.ts`)

The central condition evaluator recursively parses logic group nodes (`AND`, `OR`, `NOT`) without knowing anything about the entity scope or individual predicate details. 

When a leaf node is encountered, the evaluator dynamically queries the registry for the matching `ConditionDefinition` and executes its evaluate logic:

```typescript
export function evaluateCondition(node: ConditionNode, ctx: any): boolean {
    if (node.type === 'logical') {
        const { operator, children } = node;
        switch (operator) {
            case 'AND':
                return children.every((child) => evaluateCondition(child, ctx));
            case 'OR':
                return children.some((child) => evaluateCondition(child, ctx));
            case 'NOT':
                return !evaluateCondition(children[0], ctx);
        }
    }

    // Leaf node: lookup definition in central registry dynamically
    const definition = autoActionRegistry.getCondition(node.type);
    if (!definition) {
        throw new Error(`Automation error: Unrecognized condition predicate type: "${node.type}"`);
    }

    return definition.evaluate(ctx, node);
}
```

This dynamic registry lookup makes `evaluator.ts` completely scope-agnostic and decoupled from any domain rules.

---

## 3. Modular Task Conditions Directory

To ensure maximum maintainability, loose coupling, and ease of readability, the 10 task-scoped condition definitions are split into individual files inside a dedicated `conditions/` directory.

### Directory Layout
```
scopes/task/
├── types.ts              # Zod schemas for context & individual leaf nodes
├── conditions.ts         # Bridge re-exporting ./conditions/index.js
└── conditions/
    ├── index.ts          # Grouped imports & re-exports
    ├── helpers.ts        # Shared field value extraction helpers
    ├── TaskFieldChanged.ts
    ├── TaskFieldChangedTo.ts
    ├── TaskFieldChangedFrom.ts
    ├── TaskFieldChangedFromTo.ts
    ├── TaskTeamChanged.ts
    ├── TaskTeamAssigned.ts
    ├── TaskTeamUnassigned.ts
    ├── TaskMemberChanged.ts
    ├── TaskMemberAssigned.ts
    └── TaskMemberUnassigned.ts
```

### Shared Value Extraction (`helpers.ts`)
Standard task field transitions (`status`, `priority`, `title`, `version`) require fetching the historical snapshot fields. A single utility `getTaskFieldValues` is extracted to prevent code duplication:

```typescript
export function getTaskFieldValues(
    field: 'status' | 'priority' | 'title' | 'version',
    ctx: TaskContext,
): { currentValue: any; prevValue: any } {
    let prevKey: keyof TaskContext;
    let currentKey: keyof TaskContext;
    ...
    return {
        currentValue: ctx[currentKey],
        prevValue: ctx[prevKey],
    };
}
```

### Modular Condition Definition Example (`TaskFieldChangedTo.ts`)
Each file exports a single, strongly-typed `ConditionDefinition` instance:

```typescript
import type { ConditionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';
import { taskFieldChangedToSchema } from '../types.js';
import { getTaskFieldValues } from './helpers.js';

export const TaskFieldChangedToCondition: ConditionDefinition<
    typeof taskFieldChangedToSchema
> = {
    type: 'TaskFieldChangedTo',
    name: 'Task Field Changed To',
    description: 'Triggers when a specific standard task field changes to a targeted value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedToSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return currentValue === node.to && prevValue !== node.to;
    },
};
```
