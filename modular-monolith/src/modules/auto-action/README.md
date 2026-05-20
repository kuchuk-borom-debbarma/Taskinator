# Scoped Automation Engine (`auto-action` Module)

The `auto-action` module is a high-performance, modular, and loosely coupled automation engine designed to execute triggers, evaluate nested logical conditions, and execute actions. It allows users to define custom automation rules (e.g., *"When a task's status changes to `IN_PROGRESS`, set its priority and assign it to a team"* or *"When a task is updated and priority becomes high, trigger an action"*) via a unified, type-safe, and stateless framework.

---

## 🏗️ High-Level Architecture

The automation engine is built around **Entity Scopes** (currently restricted strictly to `TASK`). Instead of carrying heavy, fully-hydrated database records across events, the system utilizes a **lightweight, fresh-fetch, and optimistic locking design**:

```mermaid
sequence-chart
Title: Scoped TASK Automation Lifecycle
Domain Event -> Auto-Action Engine: Triggers event (e.g., task.updated)
Auto-Action Engine -> Registry: Fetches registered actions & Zod inputs
Auto-Action Engine -> Database: SELECT fresh task state by ID (always-fresh)
Database -> Auto-Action Engine: Returns current task and version
Auto-Action Engine -> Auto-Action Engine: Evaluates Condition AST (Stateless & Scoped)
Auto-Action Engine -> Auto-Action Engine: Validates Action Zod inputs & state constraints
Auto-Action Engine -> Database: UPDATE task SET status = X, version = version + 1 WHERE version = current
Database -> Auto-Action Engine: Update Result (Optimistic Lock check)
Note over Auto-Action Engine: Throws "Optimistic Lock Failure" if 0 rows updated
```

### Core Design Principles

1. **Scope-Organized Boundaries**: All triggers, actions, and condition predicates are organized by their entity scope inside `scopes/` (e.g., `scopes/task/`), isolating domain logic completely.
2. **Lightweight Contexts**: Trigger-time contexts (`TaskContext`) carry minimum identifiers (`taskId`, `projectId`, `actorId`) along with state comparison snapshots (`prev_` and `current_` properties) instead of heavy loaded objects.
3. **Pure Context-Based Stateless Evaluation**: The Condition Evaluation Component operates entirely on the provided trigger context snapshots. There are no lazy database fetches inside the evaluator, guaranteeing sub-millisecond, highly-optimized stateless execution.
4. **Always-Fresh Reads**: Actions fetch the latest state of the entity from the database using the unique `taskId`, ensuring they apply changes to the most recent record.
5. **Optimistic Concurrency Control**: All database updates enforce strict optimistic locking using the task's `version` column to prevent overwriting concurrent updates.

---

## 📁 Codebase Directory Structure

The code is strictly organized based on scope:

```
src/modules/auto-action/
├── README.md                 # Updated documentation mapping the scoped layout
├── index.ts                  # Root exports and scope initialization
├── types.ts                  # Root scope-agnostic types (Logical AST schemas, registry definitions)
├── registry.ts               # Unified triggers/actions registry and JSON-schema parser
├── evaluator.ts              # Root evaluator (logical recursion & scope delegation)
├── scopes/
│   └── task/
│       ├── index.ts          # Task scope bootstrapper
│       ├── types.ts          # TaskContext Zod schema and TaskPredicate discriminated union
│       ├── conditions.ts     # Task-specific predicate evaluation logic
│       ├── triggers.ts       # Task-specific triggers (task.created, task.updated)
│       └── actions/
│           └── setFields.ts  # Task-specific field updates action
└── __tests__/
    └── autoAction.test.ts    # Refactored tests verifying scoped conditions and actions
```

---

## 🧩 Component Deep-Dive

### 1. Root Types & Common AST (`types.ts`)
Defines the core logical AST tree structure. Grouping nodes (`AND`, `OR`, `NOT`) are defined recursively. The root `conditionNodeSchema` parses logical nodes recursively and spreads the scope-specific predicate schemas under a single Zod discriminated union.

### 2. Task Scope Definitions (`scopes/task/types.ts`)
Defines `taskContextSchema` and the hardcoded, transition-focused condition predicate union (`taskPredicateNodeSchema`). All general-purpose mathematical comparison operators (`eq`, `neq`, `gt`, `in`, etc.) are completely excluded. Instead, strictly transition-based hardcoded nodes are supported:

#### Standard Task Fields
Standard task fields (`status`, `priority`, `title`, `version`) are verified using the following transition predicates:

* **`TaskFieldChanged`**: Checks if the field was modified.
* **`TaskFieldChangedTo`**: Detects transition to a target value.
* **`TaskFieldChangedFrom`**: Detects transition away from a target value.
* **`TaskFieldChangedFromTo`**: Detects transition from a target value to another target value.

#### Specialized Team & Member Fields
Due to their special cascading assignment behaviors (e.g. removing a team automatically removes a member), team and member assignments are isolated from standard field changes:

* **Team Assignments**:
  * `TaskTeamChanged`: Detects team changes.
  * `TaskTeamAssigned`: Detects assignment to a team (optionally matching a specific `teamId`, or generic assignment).
  * `TaskTeamUnassigned`: Detects clearing of team assignment.
* **Member Assignments**:
  * `TaskMemberChanged`: Detects member assignment changes.
  * `TaskMemberAssigned`: Detects assignment to a member (optionally matching a specific `memberId`).
  * `TaskMemberUnassigned`: Detects clearing of member assignment.

---

### 3. Task Condition Evaluator (`scopes/task/conditions.ts`)
Implements `evaluateTaskPredicate(node: TaskPredicateNode, ctx: TaskContext): boolean`.
* Employs helper `getTaskFieldValues` to cleanly resolve standard task fields (`status`, `priority`, `title`, `version`) to their historical `prev_` and `current_` variables.
* Implements clean transition and assignment checks for Team and Member fields.

### 4. Root Evaluator (`evaluator.ts`)
Recursively processes logical nodes (`AND`, `OR`, `NOT`). When encountering a leaf predicate, it routes the node dynamically to the scope-specific predicate evaluator based on the context's scope (e.g. `ctx.scope === 'TASK'`).

---

### 5. Registry & Schema Serialization (`registry.ts`)
The `AutoActionRegistry` is a thread-safe singleton.
* **Dynamic Template Generation (`getTemplateForScope`)**: Builds a metadata catalog exposing compatible triggers, available actions, current context fields, and a dynamic list of allowed condition type names (**`conditionTypes`**) derived directly from the Zod union schema.

---

## 💻 Technical Usage & Examples

### 1. Structure of a Condition AST
Below is a complete JSON representation of a nested logical filter utilizing hardcoded transition conditions:
```json
{
  "type": "logical",
  "operator": "AND",
  "children": [
    {
      "type": "logical",
      "operator": "OR",
      "children": [
        {
          "type": "TaskFieldChangedTo",
          "field": "status",
          "to": "IN_PROGRESS"
        },
        {
          "type": "TaskTeamAssigned",
          "teamId": "team-456"
        }
      ]
    },
    {
      "type": "logical",
      "operator": "NOT",
      "children": [
        {
          "type": "TaskFieldChangedTo",
          "field": "priority",
          "to": 5
        }
      ]
    }
  ]
}
```

### 2. Executing Condition Evaluations in TypeScript
Here is how to parse, validate, and evaluate AST conditions dynamically in your code:

```typescript
import { conditionNodeSchema, evaluateCondition } from './index.js';
import type { ConditionNode, TaskContext } from './index.js';

// 1. Receive JSON string from frontend/API
const jsonString = `{
  "type": "TaskFieldChangedTo",
  "field": "status",
  "to": "IN_PROGRESS"
}`;

// 2. Validate AST against strict Zod Schema
const parsedAST: ConditionNode = conditionNodeSchema.parse(JSON.parse(jsonString));

// 3. Construct the lightweight context
const context: TaskContext = {
  traceId: "trace-999",
  scope: "TASK",
  actorId: "user-uuid",
  taskId: "task-uuid",
  projectId: "project-uuid",
  prev_status: "TODO",
  current_status: "IN_PROGRESS",
  prev_priority: 1,
  current_priority: 1,
  prev_version: 3,
  current_version: 4
};

// 4. Run stateless evaluation
const shouldExecute = evaluateCondition(parsedAST, context);
console.log(`Condition match result: ${shouldExecute}`); // outputs: true
```

---

## 🧪 Verification & Testing

### Execution Commands

To execute the test suite:
```bash
bun test src/modules/auto-action/__tests__/autoAction.test.ts
```

To run TypeScript compiler typechecking:
```bash
bun x tsc --noEmit
```
