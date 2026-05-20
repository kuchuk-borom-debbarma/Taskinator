# Requirements Specifications - Milestone v9.0 (Auto-Action Condition Component)

## 1. Structured Condition AST Definition
To enable users to build complex filtering rules for automations, the `auto-action` system must define and validate a standard recursive Condition Abstract Syntax Tree (AST).

### Requirements:
- **AST-01**: Define a recursive Zod schema `conditionNodeSchema` in `types.ts` that validates Condition Nodes:
  - **Logical Branch Node**:
    - `type === 'logical'`
    - `operator` is one of: `'AND' | 'OR' | 'NOT'`
    - `children` is an array of `ConditionNode` (except `NOT` which must contain exactly one `child` or a single-item array `children`).
  - **Predicate Leaf Node**:
    - `type === 'predicate'`
    - `field` represents a valid context field (e.g., `'status'`, `'priority'`, `'title'`, `'teamId'`, `'memberId'`).
    - `operator` is one of: `'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'empty' | 'exists' | 'changed' | 'changedTo' | 'changedFrom'`.
    - `value` is any JSON-serializable value (number, string, boolean, array, null).
- **AST-02**: Export standard TypeScript types derived from Zod: `ConditionNode`, `LogicalNode`, `PredicateNode`.

---

## 2. Fresh-Fetch & Snapshot Condition Evaluator
The condition component must evaluate the Condition AST against a given `TaskContext`. It should support trigger-time context comparisons (using snapshot variables) and fresh database lookups.

### Requirements:
- **EVL-01**: Implement `evaluateCondition(node: ConditionNode, ctx: TaskContext): boolean` in `modular-monolith/src/modules/auto-action/evaluator.ts`.
- **EVL-02**: Support **Logical Nodes**:
  - `AND`: Evaluates to `true` if and only if all child nodes evaluate to `true`.
  - `OR`: Evaluates to `true` if any child node evaluates to `true`.
  - `NOT`: Negates the evaluation of its child node.
- **EVL-03**: Support **Predicate Nodes** evaluating against:
  - **Snapshot properties**: Look up `prev_[field]` and `current_[field]` values directly from the `TaskContext` (e.g., `prev_status === 'TODO'` and `current_status === 'IN_PROGRESS'`).
  - **Operator Logic**:
    - `eq` / `neq`: Simple equality checks.
    - `gt` / `lt` / `gte` / `lte`: Numeric range comparisons.
    - `in` / `contains`: Array membership and collection checks.
    - `empty` / `exists`: Nullability, falsiness, and existence checks.
    - `changed`: True if `prev_[field] !== current_[field]`.
    - `changedTo`: True if `current_[field] === expected` and `prev_[field] !== expected`.
    - `changedFrom`: True if `prev_[field] === expected` and `current_[field] !== expected`.

---

## 3. Registry Metadata & Template Synchronization
The global `AutoActionRegistry` must expose the supported fields and operator details to the frontend to allow accurate UI rendering in the condition builder.

### Requirements:
- **REG-01**: Sync `getTemplateForScope(EntityScope.TASK)` to expose supported condition configuration:
  - Supported predicate fields (mapped from `TaskContext` snapshot schemas).
  - Supported comparison operators.
  - JSON-serializable schema templates for condition nodes.
