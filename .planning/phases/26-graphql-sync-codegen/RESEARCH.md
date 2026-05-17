# Phase 2 research: GraphQL Sync & Codegen

## 🎯 Phase Goal
Align the backend GraphQL schema with the v6.0 sequential pipeline engine and synchronize `ui-v1` via a "Big Bang" codegen update.

## 🛠️ Implementation Strategy

### 1. GraphQL Schema Updates (`autopilot.graphql`)
We need to update the `Autopilot` type, introduce the `PipelineStep` union, and define the structured AST.

**Proposed Changes:**
- **Add `PipelineStep` Union**: Includes `AutopilotCondition` and `AutopilotAction`.
- **Update `Autopilot`**: Replace `conditions` and `actions` with a single `pipeline: [PipelineStep!]!` field.
- **Structured Condition AST**:
    ```graphql
    union ConditionNode = AndNode | OrNode | NotNode | PredicateNode

    type AndNode { children: [ConditionNode!]! }
    type OrNode { children: [ConditionNode!]! }
    type NotNode { child: ConditionNode! }
    type PredicateNode {
        domain: String!
        field: String!
        operator: String!
        value: JSON! # scalar for generic values
    }

    type AutopilotCondition {
        id: ID! # Structural hash
        name: String
        definition: ConditionNode!
    }
    ```
- **Update Mutations**: `CreateAutopilotInput` and `AutopilotActionInput` must be updated to handle the new unified pipeline structure.
- **Root Schema**: After updating `autopilot.graphql`, run `bun run generate-schema` in `modular-monolith` to sync the main `schema.graphql`.

### 2. Resolver Logic (`autopilot.ts`)
The `Autopilot.pipeline` resolver will fetch `autopilot.steps` (which are `PipelineStep` references) and hydrate them using the repositories.

- **`Autopilot.pipeline`**:
    - Iterate through `steps` from DB.
    - If `type === 'condition'`, call `conditionRepository.getConditionByHash(refId)`.
    - If `type === 'action'`, call `actionRepository.getActionByHash(refId)`.
    - Return objects with `__typename` for the Union.
- **Recursive Resolvers**: The `ConditionNode` union will require recursive resolvers for `AndNode`, `OrNode`, and `NotNode`.

### 3. UI Codegen & Fixes (`ui-v1`)
- Run `npm run codegen` in the `ui-v1` directory.
- **Major Fixes Required**:
    - `AutopilotCard.tsx`: Update to use the `pipeline` array.
    - `AutopilotDashboardView.tsx` & `AutopilotList.tsx`: Update queries to include fragments for the `PipelineStep` union.
    - `CreateAutopilotModal.tsx`: Refactor form submission and mutation logic for the new unified input.
    - `PipelineEditor`: Refactor to handle the mixed list of conditions and actions.
    - `Builder`: Update to use the new `autopilotMetadata` query and handle the structured AST.
- **Deprecation**: Delete `GraphQLAutopilotAPI.ts` and ensure all components use the generated hooks.

## 🔗 Traceability
- **CONTEXT**: Matches decisions from `26-CONTEXT.md`.
- **MANDATES**: GQL-01, GQL-02.
