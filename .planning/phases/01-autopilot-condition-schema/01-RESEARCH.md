# Phase 01: Autopilot & Condition Schema - Research

**Date:** 2026-05-15
**Phase Goal:** Define and implement the database schema for Autopilots and their logical conditions.

## Technical Findings

### 1. Kysely JSONB Implementation
To maintain type safety for the `JSONB` condition tree, we will use the `JSONColumnType<T>` utility. This ensures that TypeScript handles the serialization and deserialization seamlessly while maintaining full IDE support for nested fields.

**Pattern:**
```typescript
import { JSONColumnType } from 'kysely';

export interface AutopilotTable {
  id: Generated<string>;
  fk_project_id: string;
  triggers: string[]; // e.g. ['TASK_CREATED', 'TASK_UPDATED']
  conditions: JSONColumnType<ConditionTree>;
  is_active: Generated<boolean>;
  created_at: ColumnType<Date, string | undefined, never>;
  // ... other fields
}
```

### 2. Condition Tree Structure
The `ConditionTree` will be a recursive union type to support complex Boolean logic.

**Definition:**
```typescript
type ConditionNode = 
  | { type: 'and', children: ConditionNode[] }
  | { type: 'or', children: ConditionNode[] }
  | { type: 'not', child: ConditionNode }
  | { type: 'predicate', domain: string, field: string, operator: string, value: any };

type ConditionTree = ConditionNode;
```

### 3. Evaluation Pattern (Interpreter)
For evaluating the JSONB tree against a "Live Context", we will use the **Interpreter Pattern**. Each node type will have a corresponding resolver.

**Evaluation logic:**
1. **And/Or/Not**: Recursively evaluate children.
2. **Predicate**: Fetch the field value from the provided `Context` object and apply the operator.

### 4. Runtime Validation
Since JSONB can drift, we will use **Zod** to validate autopilot definitions on write (API layer) and optionally on read if high strictness is required.

## Proposed Schema

### `autopilot` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique ID |
| fk_project_id | UUID (FK) | Scoped to project |
| triggers | TEXT[] | List of domain event types |
| conditions | JSONB | Nested logic tree |
| is_active | BOOLEAN | Enable/Disable toggle |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

## Implementation Strategy
1. Create `autopilot.ts` in `src/database/tables/`.
2. Update `Database` interface in `src/database/index.ts`.
3. Create `ConditionEvaluator.ts` in a new `src/modules/autopilot/internal/` directory.
4. Implement Zod schema for `ConditionTree`.

## Verification Plan
- **Unit Tests**: Mock a `Context` object and verify the `ConditionEvaluator` handles AND/OR/NOT nesting correctly.
- **DB Tests**: Verify Kysely can insert and retrieve complex JSONB structures without data loss.
