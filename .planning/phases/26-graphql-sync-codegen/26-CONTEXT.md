# Phase 26 Context: GraphQL Sync & Codegen

## 🎯 Phase Goal
Align the backend GraphQL schema with the v6.0 sequential pipeline engine and synchronize `ui-v1` via a "Big Bang" codegen update.

## 🛠️ Decisions & Constraints

### 1. Sequential Pipeline Schema (Union Type)
- **Decision**: Use a GraphQL `Union` type to represent the pipeline sequence.
- **Structure**:
  ```graphql
  union PipelineStep = AutopilotCondition | AutopilotAction

  type Autopilot {
    # ... other fields
    pipeline: [PipelineStep!]!
  }
  ```
- **Rationale**: Provides maximum type safety and reflects the v6.0 engine's unified execution array while allowing the UI to distinguish between logic types via `__typename`.

### 2. Hydration Strategy
- **Decision**: Return **Fully Hydrated Logic** (full ASTs) in the GraphQL response.
- **Implementation**: The resolvers for `PipelineStep` must fetch the underlying logic from `ConditionRepository` or `ActionRepository` using the `refId` stored in the database.
- **Rationale**: Simplifies UI state management by providing the entire builder configuration in a single query, avoiding waterfall fetches for logic details.

### 3. Metadata Discovery
- **Decision**: Implement a `Query.autopilotMetadata(entityType: String!)` endpoint.
- **Payload**: Should return valid predicates (fields/operators) and action types available for the requested `entityType` (Task, Project, Team).
- **Rationale**: Enables the UI to dynamically filter the builder UI based on the selected trigger context.

### 4. UI Synchronization (Big Bang Update)
- **Decision**: Perform a "Big Bang" update for `ui-v1` codegen.
- **Process**:
  1. Update backend schema.
  2. Run `npm run codegen` in `ui-v1`.
  3. **Mandatory**: Fix all resulting TypeScript errors in `AutopilotCard`, `Builder`, and `Pipeline` components immediately.
- **Rationale**: Ensures the UI remains in strict sync with the backend engine and prevents "type debt" from accumulating during the transition.

## 🔗 Traceability
- **Milestone**: v7.0 (UI Alignment)
- **Engine Version**: v6.0 (Sequential, Resumable)
- **Mandates**: GQL-01, GQL-02

## 📅 Next Steps
- Run `/gsd:research-phase 26` to map specific schema changes and resolver implementation details.
