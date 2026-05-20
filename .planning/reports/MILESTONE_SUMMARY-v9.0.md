# Milestone Summary: Milestone v9.0 - Auto-Action Condition Component

## 1. Overview
Milestone v9.0 establishes a robust, high-performance, and modular condition evaluation component for the scoped `auto-action` automation module within the Taskinator monolith. To simplify pipeline configuration and align perfectly with event triggers, we moved away from generic comparison operators (like `eq`, `neq`, `gt`) in favor of **strict transition-focused condition predicate nodes** and logical grouping trees (`AND`/`OR`/`NOT`).

This milestone successfully implements:
- A recursive Zod-validated Condition Abstract Syntax Tree (AST) supporting complex logic trees.
- A fully decoupled, scope-agnostic evaluation engine.
- A dynamic, type-safe registry model allowing scopes to register custom triggers, actions, and conditions independently.
- Isolated template serialization to facilitate clean frontend builder integration with zero circular dependency issues.

---

## 2. Architecture
The refactored `auto-action` engine uses a highly decoupled, dynamic design:

* **Dynamic Registry (`registry.ts`)**: `AutoActionRegistry` stores generic `ConditionDefinition`, `ActionDefinition`, and `TriggerDefinition` arrays/maps. It knows nothing about task-specific transition fields or schemas.
* **Condition Interface (`types.ts`)**: Exposes `ConditionDefinition` which encapsulates type metadata, schema validation, and evaluation logic:
  ```typescript
  export interface ConditionDefinition<NodeSchema extends z.ZodObject<any> = z.ZodObject<any>> {
      readonly type: string;
      readonly name: string;
      readonly description?: string;
      readonly isAsync: boolean;
      readonly scope: EntityScope;
      readonly schema: NodeSchema;
      evaluate(ctx: any, node: z.infer<NodeSchema>): boolean;
  }
  ```
* **Scope-Agnostic Evaluator (`evaluator.ts`)**: Recursively evaluates AST logical nodes (`AND`/`OR`/`NOT`) and delegates leaf predicate evaluation dynamically by looking up the condition type inside the registry.
* **Task Scope Implementation (`scopes/task/`)**: Encapsulates all task-scoped details:
  - `types.ts`: Exposes `taskContextSchema` including trigger snapshots (`prev_*` and `current_*` values) and the AST leaf predicate unions.
  - `conditions.ts`: Defines 10 transition-specific `ConditionDefinition`s (e.g. `TaskFieldChanged`, `TaskTeamAssigned`, etc.) that execute purely synchronous context validations.
  - `index.ts`: Bootstraps and registers all 10 task conditions during engine initialization.
* **Decoupled Template Serialization (`template.ts`)**: Standalone `getTemplateForScope` extracts all registered components, deserializes Zod schemas, and prepares template metadata for UI rendering.

---

## 3. Phases
All three planned phases under Milestone v9.0 are completed and validated:

* **Phase 31: Condition AST Schema & Types (Completed)**
  * Defined structural condition AST Zod schemas and derived TypeScript types supporting logical nesting.
* **Phase 32: Condition Evaluation Engine (Completed)**
  * Implemented recursive evaluation of logic gates and specialized transition predicates (standard fields, team/member assignments).
* **Phase 33: Registry & E2E Validation (Completed)**
  * Extracted standalone `template.ts`, registered task conditions during boot, and updated the test suite to achieve full verification.

---

## 4. Key Decisions
* **Transition-focused Predicates instead of Generic Comparisons**: Avoided mathematical/relational operators. All leaf predicates represent real transitions (e.g., `TaskFieldChangedTo`, `TaskFieldChangedFromTo`, `TaskTeamAssigned`, etc.) to streamline configuration and enforce correct state checks.
* **Decoupled Evaluator Routing**: The root evaluator dynamically resolves leaves via registry lookup. Adding new scopes (e.g., `PROJECT`) in the future requires absolutely zero changes to `evaluator.ts`.
* **Isolated Template Generation**: Moved the JSON serialization schema parsing to `template.ts` to prevent importing entity-specific schemas (`taskContextSchema`) into the registry, solving potential circular import issues.

---

## 5. Requirements Matching
* **AST-01 & AST-02 (Met)**: Defined the recursive AST schema validating `logical` nodes and the 10 transition predicates under the TASK scope. Exported `ConditionNode` and derived types.
* **EVL-01 to EVL-03 (Met)**: Implemented recursive `evaluateCondition` supporting `AND`, `OR`, `NOT` logic gates and evaluating leaves against snapshot values (`prev_*` and `current_*`) in `TaskContext`.
* **REG-01 (Met)**: Updated template serialization to output registered condition definitions alongside their serialized parameter schemas and `isAsync: false` indicators.

---

## 6. Technical Debt
* **Next Scope Scaling**: The registry and evaluator are fully prepared for next-entity integration. New scopes will only need to define their own subdirectories under `scopes/` and register their triggers, actions, and conditions at boot.

---

## 7. Getting Started

### Running the Test Suite
To verify condition AST validation, evaluation logic, and template outputs under Bun:
```bash
bun test src/modules/auto-action/__tests__/autoAction.test.ts
```

### Adding a New Condition
1. Define a Zod schema validating input parameters.
2. Implement the `ConditionDefinition` interface:
   ```typescript
   export const MyCustomCondition: ConditionDefinition<typeof mySchema> = {
       type: 'MyCustomCondition',
       name: 'My Custom Condition',
       isAsync: false,
       scope: EntityScope.TASK,
       schema: mySchema,
       evaluate(ctx, node) {
           // Return evaluation boolean
       }
   };
   ```
3. Register the definition during initialization:
   ```typescript
   autoActionRegistry.registerCondition(MyCustomCondition);
   ```
