# Phase 27: Builder & Canvas Alignment - Research

**Researched:** 2025-03-24
**Domain:** Frontend UI / Autopilot Orchestration
**Confidence:** HIGH

## Summary

This phase aligns the visual Autopilot Builder with the v6.0 sequential pipeline model. The primary shift is moving from a single "Big Guard Condition" to an interleaved "Condition & Action" list, where logic blocks can be placed anywhere in the execution sequence. 

We will implement a global `AutopilotMetadataContext` to manage entity-aware fields and operators, ensuring the UI remains "locked" to the context of the chosen trigger (e.g., if a Task trigger is chosen, only Task fields are editable). The XYFlow serializers will be updated to handle the recursive GQL union structure directly.

**Primary recommendation:** Centralize all entity metadata in a single Provider at the Dashboard level and refactor the `ActionPipelineEditor` to be a generic `PipelineEditor` that supports both `ConditionStepCard` and `ActionStepCard`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Metadata Discovery (Global Context)**: Fetch `autopilotMetadata` once in `AutopilotDashboardView` and provide it via an `AutopilotMetadataContext`.
- **Sequential Interleaving (The "Logic Block" Model)**: Builder refactored into a `ConditionStepCard` interleaved with `ActionStepCard` within `ActionPipelineEditor`.
- **Lazy-Context & Entity Awareness**: Implement **Trigger-Locked Context**. Metadata filtering enforced by the `triggerEntityType`.
- **AST Synchronization (Type-Safe Unions)**: Update `treeSerializer.ts` and `treeDeserializer.ts` to work directly with the **GQL ConditionNode Union** structure (AndNode, OrNode, etc.).

### the agent's Discretion
- Exact prop changes for `ConditionBuilderCanvas` to support context injection.
- UI UX for "Mini Canvas" summary in the pipeline list.
- Selection of reordering library (recommending `framer-motion`).

### Deferred Ideas (OUT OF SCOPE)
- Node-based Pipeline Editor: We are retaining the sequential list view for this phase (per OOS-01).
- Client-side Execution Logs: Visualizing live execution progress is deferred (per OOS-02).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-CTX-02 | Predicate dropdowns populated from MetadataContext | `autopilotMetadata` GQL query discovered; maps entity types to fields/operators. |
| UI-PIPE-01 | `ActionPipelineEditor` as primary orchestration | Refactoring plan to support mixed `pipeline` array (Condition + Action). |
| UI-PIPE-02 | Drag-and-drop reordering for Condition/Action blocks | `framer-motion` identified as existing project dependency for list reordering. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Metadata Fetching | API (Backend) | Frontend Server | Backend owns the `ModularOperatorRegistry`. |
| Metadata Caching | Frontend (Client) | — | Fetched once at dashboard root to prevent flickering. |
| Condition Logic | Frontend (Client) | API (Backend) | UI builds the AST; Backend evaluates it at runtime. |
| Pipeline Ordering | Frontend (Client) | API (Backend) | UI handles DND; Backend persists index/sequence. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.2 | Visual Condition Builder | Industry standard for node-based UIs. |
| framer-motion | 12.38.0 | Pipeline reordering | Built-in layout animations and DND support. |
| @tanstack/react-query | 5.99.0 | Metadata synchronization | Handles caching and stale-time for `autopilotMetadata`. |

**Installation:**
```bash
# All packages already installed in ui-v1/package.json
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @xyflow/react | npm | 1+ yr | ~200k/wk | github.com/xyflow/xyflow | [OK] | Approved |
| framer-motion | npm | 5+ yrs | ~4M/wk | github.com/framer/motion | [OK] | Approved |
| @tanstack/react-query | npm | 4+ yrs | ~10M/wk | github.com/TanStack/query | [OK] | Approved |

## Architecture Patterns

### Recommended Project Structure
```
ui-v1/src/components/Autopilot/
├── AutopilotMetadataContext.tsx    # [NEW] Provider for entity metadata
├── AutopilotTriggerContext.tsx     # [NEW] Provider for current trigger context
├── Builder/
│   ├── ConditionStepCard.tsx      # [NEW] Wrapper for interleaving in list
│   ├── treeSerializer.ts          # [UPDATE] Use GQL union typenames
│   └── treeDeserializer.ts        # [UPDATE] Use GQL union typenames
└── Pipeline/
    ├── PipelineEditor.tsx         # [RENAME/REFACTOR] From ActionPipelineEditor
    └── PipelineStepConnector.tsx  # [EXTRACT] Connector arrow UI
```

### Pattern 1: Trigger-Locked Metadata Filtering
The `AutopilotMetadataContext` should expose a helper to get fields based on the active trigger entity.

```typescript
// Pattern: Filter fields based on trigger entity type
const { getFieldsForEntity } = useAutopilotMetadata();
const { triggerEntityType } = useAutopilotTrigger(); // 'task' | 'project' | 'team'

const availableFields = useMemo(() => 
  getFieldsForEntity(triggerEntityType), 
[getFieldsForEntity, triggerEntityType]);
```

### Pattern 2: Recursive GQL Union Serializer
Serializers must map XYFlow node types to GQL `__typename` for seamless API round-trips.

```typescript
// Example for treeSerializer.ts
if (node.type === 'predicateNode') {
  return {
    __typename: 'PredicateNode',
    domain: node.data.domain,
    field: node.data.field,
    operator: node.data.operator,
    value: node.data.value,
  };
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GQL Type Definitions | Manual interfaces | `ui-v1/src/gql/graphql.ts` | Codegen ensures sync with `ConditionNode` union. |
| List Reordering | Custom DND logic | `framer-motion` `Reorder` | Low friction, handles layout animations automatically. |
| Metadata Registry | Hardcoded constants | `autopilotMetadata` query | Backend is source of truth for operators/actions. |

## Common Pitfalls

### Pitfall 1: Type Erasure in Unions
**What goes wrong:** Serializing a node but forgetting the `__typename` or using `type: "and"` instead of `__typename: "AndNode"`.
**How to avoid:** Use the generated GQL types in the serializers and enforce `__typename` in the `PipelineStep` union.

### Pitfall 2: Stale Trigger Context
**What goes wrong:** Changing the trigger in Step 1 but predicates in Step 2 still showing fields for the old trigger.
**How to avoid:** Clear the pipeline or validate steps when `triggerEntityType` changes in `CreateAutopilotModal`.

## Code Examples

### GQL Union Fragment (Reference)
```typescript
// Source: modular-monolith/src/graphql/resolvers/autopilot.ts
export const AUTOPILOT_CONDITION_FRAGMENT = graphql(`
  fragment ConditionNodeFragment on ConditionNode {
    ... on AndNode { __typename children { ...Recursive } }
    ... on OrNode { __typename children { ...Recursive } }
    ... on NotNode { __typename child { ...Recursive } }
    ... on PredicateNode { __typename domain field operator value }
  }
`);
```

### Metadata Context Implementation
```typescript
export const AutopilotMetadataProvider = ({ children }) => {
  const { data } = useQuery({ queryKey: ['metadata', 'task'], ... });
  const value = {
    taskFields: data?.autopilotMetadata.entities[0].fields ?? [],
    // ...
  };
  return <AutopilotMetadataContext.Provider value={value}>{children}</AutopilotMetadataContext.Provider>;
};
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `framer-motion` can handle the reordering UX | Standard Stack | May need a dedicated DND library if complex. |
| A2 | Triggers follow `entity.event` format | Trigger-Locked Context | Extraction logic `split('.')[0]` might fail. |

## Open Questions (RESOLVED)

1. **Persistence of Triggers:** The GQL schema shows triggers as an empty array. How should the UI handle Step 1 selections if the backend isn't ready to save them yet?
   - **Resolution**: We will add a `triggers JSONB DEFAULT '[]'` column to the `autopilot` table and update the resolver/mutation in Plan 27-01 to ensure full round-trip persistence.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm | Dependency management | ✓ | 11.9.0 | — |
| Vite | Dev server | ✓ | 8.0.4 | — |
| PostgreSQL | Backend Metadata | ✗ | — | Backend mock for metadata |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest / Jest |
| Config file | `ui-v1/vitest.config.ts` |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-CTX-02 | Fields filtered by entity | unit | `npm test PredicateEditorPanel` | ❌ Wave 0 |
| UI-PIPE-01 | Mixed pipeline support | integration | `npm test PipelineEditor` | ❌ Wave 0 |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | GQL Typed Inputs for AST |

### Known Threat Patterns for XYFlow

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AST Injection | Tampering | Strict GQL Union validation on backend |
| Recursive Depth Exhaustion | Denial of Service | `MAX_CONDITION_DEPTH = 10` in resolver |

## Sources

### Primary (HIGH confidence)
- `modular-monolith/src/graphql/resolvers/autopilot.ts` - GQL structure
- `ui-v1/src/gql/graphql.ts` - Codegen types
- `ui-v1/src/components/Autopilot/Builder/treeSerializer.ts` - Current implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Core project tech.
- Architecture: HIGH - Decision-driven alignment.
- Pitfalls: MEDIUM - UI/GQL sync is always sensitive.

**Research date:** 2025-03-24
**Valid until:** 2025-04-23
