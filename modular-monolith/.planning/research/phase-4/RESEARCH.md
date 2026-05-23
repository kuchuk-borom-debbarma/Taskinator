<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
(No CONTEXT.md found, assuming standard CWB requirements apply)

### the agent's Discretion
- The structure of the `BehaviorSettingsCatalog` object returned by `getBehaviorSettingsCatalog`.
- The exact GraphQL schema for `BehaviorSettingsCatalog`.

### Deferred Ideas (OUT OF SCOPE)
- N/A
</user_constraints>

# Phase 4: UI Metadata & Cleanup - Research

**Researched:** 2024-05-18
**Domain:** Code Cleanup & GraphQL API
**Confidence:** HIGH

## Summary

The goal of Phase 4 is to remove all legacy Configurable Workflow Builder (CWB) AST code and introduce a new static API (`getBehaviorSettingsCatalog`) to expose the available `behavior_rule` features to the UI. The old AST engine files in `internal/engines`, `internal/execution`, and `scopes/task` can be safely deleted. 

**Primary recommendation:** Define a `BehaviorSettingsCatalog` GraphQL Query and implement it as a hardcoded static mapping in `AutoActionServiceImpl`. Prune the `AutoActionService` interface by dropping the `handleSyncTaskEvents`, `executePipeline`, and `getTemplateForScope` methods entirely. Delete the legacy AST scopes, engines, and executors. 

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| UI Metadata Catalog | API / Backend | Browser / Client | The API provides a single source of truth for available behaviors, ensuring the UI doesn't allow configuring disabled behaviors. |
| Rule Execution | API / Backend | Database | Old AST execution is removed; new rule execution lives in guards and cascades (implemented in Phase 2 & 3). |

## Standard Stack

No new stack dependencies are introduced in this phase.

## Package Legitimacy Audit

No packages are installed during this phase.

## Architecture Patterns

### Recommended Project Structure Changes

```text
src/modules/auto-action/
├── internal/
│   ├── (DELETE) engines/
│   ├── (DELETE) execution/
│   ├── (DELETE) service/validation.ts
│   └── service/AutoActionServiceImpl.ts
├── (DELETE) scopes/
```

### Pattern 1: BehaviorSettingsCatalog

**What:** A static, predefined catalog of supported system behaviors.
**When to use:** Used by the frontend form to populate the "Add Rule" dropdowns and form fields.
**Example:**
```typescript
// src/modules/auto-action/internal/service/AutoActionServiceImpl.ts
async getBehaviorSettingsCatalog(projectId: string): Promise<BehaviorSettingsCatalog> {
    // Validate that the user has access to the project
    // (If the actor context is available; otherwise pass actorId through the service signature)
    
    return {
        behaviors: [
            {
                type: 'BLOCKER_RESOLUTION',
                name: 'Blocker Resolution',
                description: 'Automatically transitions parent tasks when blockers are complete.',
                isGuard: false,
                supportedCriteriaFields: ['status'],
                supportedActionFields: ['status']
            },
            // ...other behaviors
        ]
    };
}
```

### Pattern 2: GraphQL Schema for Catalog

**What:** A replacement for the legacy `AutoActionTemplate`.
**When to use:** The UI will query this instead of `autoActionTemplate`.
**Example:**
```graphql
# src/graphql/schema/auto-action/behavior-settings.graphql
type BehaviorDefinition {
  type: String!
  name: String!
  description: String!
  isGuard: Boolean!
  supportedCriteriaFields: [String!]!
  supportedActionFields: [String!]!
}

type BehaviorSettingsCatalog {
  behaviors: [BehaviorDefinition!]!
}

extend type Query {
  behaviorSettingsCatalog(projectId: ID!): BehaviorSettingsCatalog!
}
```

## Don't Hand-Roll

N/A - purely a refactor/cleanup phase.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Old `auto_action` data (AST structures) | None - truncated via SQL in Phase 1 |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | Old `*.js` map files | Run standard TS clean |

## Common Pitfalls

### Pitfall 1: Dangling Imports in Service Index
**What goes wrong:** The app crashes at startup due to missing module imports.
**Why it happens:** Deleting `scopes/task/` but forgetting to remove `initTaskScope()` and `import { initTaskScope } ...` from `src/modules/auto-action/index.ts`.
**How to avoid:** Ensure all exports/imports in `index.ts` and `types.ts` that reference `scopes/` are pruned. Also, remove `syncActionRegistry` listeners from `index.ts` that invoke `handleSyncTaskEvents`.

### Pitfall 2: Broken GraphQL Schema
**What goes wrong:** Apollo Server fails to start because a Query resolver is missing its schema definition.
**Why it happens:** Removing the `autoActionTemplate` query from the `.ts` resolver file but leaving it in `auto-action-template.graphql`.
**How to avoid:** Delete `auto-action-template.graphql` entirely, and prune any `autoActionTemplate` bindings in `src/graphql/resolvers/autoAction.ts`. 

### Pitfall 3: Incomplete Consumer Refactor
**What goes wrong:** `AutoActionTaskEventConsumer.ts` tries to call `autoActionService.handleTaskEvents` which no longer exists.
**Why it happens:** Forgetting that the consumer historically called the AST execution pipeline.
**How to avoid:** Remove the `await autoActionService.handleTaskEvents(events);` call from `src/modules/auto-action/internal/listeners/AutoActionTaskEventConsumer.ts`.

## Code Examples

### Pruning `types.ts`
```typescript
// src/modules/auto-action/types.ts
// Remove all ActionStep, PipelineStep, ConditionNode schemas.
// The file should likely only retain EntityScope and perhaps new Behavior types.
export enum EntityScope {
    TASK = 'TASK',
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AST execution via `executePipeline` | Direct hardcoded DB queries (Guard/Cascade) | Phase 2 & 3 | Better performance, removal of complex engine code. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Existing `createAutoAction` and `updateAutoAction` endpoints should be kept for compatibility | Summary | Leaving them in might confuse developers since `behavior_rule` is replacing them, but since Phase 1 didn't drop the `auto_action` table, these endpoints might still be safe to keep (minus their AST pipeline execution). |
| A2 | `BehaviorSettingsCatalog` should just be static mapping | Architecture Patterns | The frontend might expect dynamic or different payload shapes. |

## Open Questions

1. **GraphQL CRUD Endpoints for `auto_action`**
   - What we know: Phase 1 wiped `auto_action` data, but didn't drop the tables or CRUD endpoints.
   - What's unclear: Should we also delete `createAutoAction`, `updateAutoAction` resolvers and methods in this phase?
   - Recommendation: The prompt only explicitly mentioned "Delete legacy AST files and unused executors." Leave the CRUD methods, but delete their AST pipeline validation logic (e.g., `validatePipeline` calls).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest |
| Config file | `jest.config.js` |
| Quick run command | `npm test -- src/modules/auto-action` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | `getBehaviorSettingsCatalog` returns defined behaviors | unit | `npm test -- src/modules/auto-action/__tests__/BehaviorSettings.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `src/modules/auto-action/__tests__/BehaviorSettings.test.ts` - Needs creation.
- [ ] Ensure old test files (like `autoActionEngine.test.ts`, `contextEngine.test.ts`, `AutoActionRuntime.test.ts`) are deleted.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Application | ✓ | — | — |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | Verify actor access via `assertActorCanAccessProject` |

### Known Threat Patterns for CWB

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on Catalog | Information Disclosure | Ensure `getBehaviorSettingsCatalog` calls `assertActorCanAccessProject` before returning settings if they ever become dynamically filtered by project. |
