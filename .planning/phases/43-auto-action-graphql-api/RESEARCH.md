---
phase: 43
name: Auto Action GraphQL API
status: complete
created: 2026-05-22
requirements:
  - GQL-01
  - GQL-02
  - GQL-03
  - GQL-04
  - GQL-05
  - PAGE-01
  - PAGE-02
  - PAGE-03
  - SVC-03
---

# Phase 43 Research: Auto Action GraphQL API

## RESEARCH COMPLETE

## Scope

Phase 43 exposes auto-action management through GraphQL:

- create/update mutations
- single auto-action query by ID
- project-scoped list query using connection/edge pagination
- nested fields loaded through DataLoader
- resolvers delegating to `AutoActionService`, not module internals

## Existing GraphQL Patterns

GraphQL type definitions live under `modular-monolith/src/graphql/schema/**` and are merged automatically by `schema.ts`. Existing modules use one base schema file plus optional extension file:

- `schema/project/project.graphql`
- `schema/project/project-extension.graphql`
- `schema/task/task.graphql`
- `schema/task/task-extension.graphql`

Resolvers are merged in `modular-monolith/src/graphql/resolvers/index.ts`. Each module has one resolver file with object field resolvers, root queries, and root mutations.

Existing connection shape:

```graphql
type ProjectConnection {
  edges: [ProjectEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type ProjectEdge {
  node: Project!
  cursor: String!
}
```

Shared `PageInfo` already exists in `schema/common.graphql`. Phase 43 should reuse it and define only `AutoActionConnection` and `AutoActionEdge`.

## Existing Pagination Patterns

Shared TypeScript types live in `modular-monolith/src/types/pagination.ts`:

- `PaginationParams`
- `PageInfo`
- `Connection<T>`

Cursor helpers live in `modular-monolith/src/utils/utils.ts`:

- `encodeCursor(timeValue, id)`
- `decodeCursor(cursor)`

Existing resolvers map service results into `edges` and `pageInfo`. Project lists also include `totalCount`. Phase 43 requirement `PAGE-03` asks for stable cursors and total metadata where conventions require it, so auto-action list should include `totalCount`.

Recommended cursor ordering: `created_at`, `id`. Use `encodeCursor(autoAction.created_at.toISOString(), autoAction.id)` or a query-level epoch precision if added later.

## Existing DataLoader Patterns

Per-request loaders are created in `modular-monolith/src/graphql/dls/index.ts` and attached through `GraphQLContext`:

- `user.byId`
- `project.byId`
- `project.byActorIdAndId`
- `task.byId`
- `task.byActorIdAndId`
- `team.byId`
- `team.byActorIdAndId`
- `projectMember.byId`
- `projectMember.byActorIdAndId`

Authorization-aware loader pattern groups keys by actor and delegates to service batch functions. Auto-action should add:

- `autoAction.byId()` for authorized-internal or already-scoped loads
- `autoAction.byActorIdAndId()` for root query authorization

Nested auto-action fields should use existing loaders:

- `project` -> `context.loaders.project.byActorIdAndId`
- `createdBy` -> `context.loaders.user.byId`
- `updatedBy` -> `context.loaders.user.byId`

## Service Boundary Needs

Current `AutoActionService` has:

- `createAutoAction(data)`
- `updateAutoAction(id, data, expectedVersion)`
- `deleteAutoAction(id)`
- `getAutoActionsForProject(projectId)`
- `getAutoActionById(id)`
- `handleTaskEvents(events)`
- `getTemplateForScope(scope, isSync)`
- `executePipeline(...)`

GraphQL needs auth-aware and paginated service methods so resolvers do not call internal queries:

- `getAutoActionsByIds(ids)`
- `getAutoActionForActor(actorId, id)`
- `getAutoActionsForActorByIds(actorId, ids)`
- `getAutoActionsForProjectConnection(actorId, projectId, pagination)`
- optional small input wrappers:
  - `createAutoActionForActor(actorId, input)`
  - `updateAutoActionForActor(actorId, id, version, input)`

Authorization should likely reuse project membership as boundary: actor must be authorized for `fk_project_id` before seeing or mutating a rule. Existing project service has auth-aware project loaders and batch service methods; GraphQL can validate project access before calling auto-action service, but stronger boundary is better in auto-action service functions.

## Query Layer Needs

Internal query functions remain under `modules/auto-action/internal/queries/AutoActionQueries.ts`. Add focused query helpers only:

- `selectAutoActionsByIds(ids)`
- `selectAutoActionsByProjectConnection(projectId, pagination)`
- `countAutoActionsForProject(projectId)`

Keep auth outside raw query helpers unless project membership joins already have a local pattern. Raw queries should stay small and deterministic.

## Schema Shape Recommendation

Add:

- `src/graphql/schema/auto-action/auto-action.graphql`
- `src/graphql/schema/auto-action/auto-action-extension.graphql`
- `src/graphql/resolvers/autoAction.ts`
- `src/graphql/resolvers/jsonScalar.ts`
- `src/graphql/dls/autoAction.ts`

Types:

- `AutoAction`
- `AutoActionConnection`
- `AutoActionEdge`
- `CreateAutoActionInput`
- `UpdateAutoActionInput`
- `DeleteAutoActionPayload`

There is no existing `scalar JSON` or `graphql-scalars` dependency in the repo. Safest KISS path is to add a tiny local JSON scalar resolver for arbitrary pipeline `triggers` and `steps`, because over-modeling those shapes would leak engine internals into GraphQL:

- declare `scalar JSON`
- add a local scalar resolver in GraphQL resolver merge path
- keep input/output values as plain JSON-compatible values

Fallback if scalar integration becomes unexpectedly noisy: expose `triggersJson` and `stepsJson` as strings and parse at the resolver boundary, but this is less ergonomic and should not be first choice.

## Tests To Add

Focused tests should cover:

- resolver single query uses `context.loaders.autoAction.byActorIdAndId`
- resolver list returns `edges`, cursors, `pageInfo`, `totalCount`
- create/update mutations require `context.userId` and delegate to service
- nested `project`, `createdBy`, `updatedBy` use DataLoader
- `autoAction` DataLoader batches by actor and preserves input order
- service/query pagination returns stable cursor metadata

Existing auto-action tests use Bun because Jest has ESM `.js` import friction. Continue with Bun tests unless repository GraphQL tests already provide a stronger local pattern.

## Risks

- Auth can leak auto-action records if `getAutoActionById` is used directly in root GraphQL query. Use auth-aware service/DataLoader for root reads.
- Over-modeling `steps` and `triggers` can couple GraphQL schema to internal engine shapes too early. Prefer minimal JSON or narrow DTO mapping.
- Existing connection implementations are not fully centralized. Follow current shape, but keep auto-action pagination service-level so future common helper extraction is easy.
