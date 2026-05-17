# Context: Phase 26 - GraphQL Sync & Codegen

## 🎯 Goal
Align the backend GraphQL schema and resolvers with the v6.0 engine changes and synchronize `ui-v1` using a modern, codegen-driven approach.

## 🛠️ Decisions

### 1. Backend Schema Alignment
- **Sequential Pipeline**: The `Autopilot` GraphQL type will be updated to use a unified `steps` array instead of separated `conditions` and `actions`.
- **Structured AST (Unions)**: The `ConditionAST` and `ActionAST` will be defined as structured recursive types using GraphQL Unions for high type safety.
- **Entity Agnosticism**: Triggers and conditions will explicitly support `EntityType` (Project, Task, Team).

### 2. GraphQL Infrastructure
- **JSON Scalar**: A `JSON` scalar will be used for the `value` field in predicates to handle diverse data types (string, number, boolean, etc.).
- **Resolver Implementation**: The current stubbed resolvers in `src/graphql/resolvers/autopilot.ts` will be fully implemented to interact with the `autopilotQueryService` and the database.

### 3. UI Modernization (Codegen)
- **Full Migration**: The manual `fetch`-based `GraphQLAutopilotAPI` adapter will be deprecated in favor of generated hooks from `graphql-codegen`.
- **Fragment-Masking**: We will utilize the `client-preset` (fragment masking) to ensure components only access the data they explicitly request.
- **Immediate Type Fixes**: The existing Autopilot components will be updated to consume the new generated types, fixing all breakages introduced by the schema shift.

## 📋 Impact on Requirements

- **GQL-01**: Fetching latest schema becomes a primary task after backend alignment.
- **GQL-02**: Codegen will produce the source of truth for all Autopilot UI types.

## 🚀 Next Steps
1. Researcher will define the exact GraphQL Union structure for the AST in a `RESEARCH.md`.
2. Planner will design the updated `autopilot.graphql` and the corresponding resolver logic.
3. Execution will involve:
    - Modifying `modular-monolith` GraphQL files.
    - Implementing resolvers.
    - Running `codegen` in `ui-v1`.
    - Refactoring `ui-v1` components to use the new hooks.
