# Topo-Tracer Instrumentation Contract

This document is the source of truth for adding tracing to Taskinator's
modular monolith. Read it before adding, changing, or reviewing any
Topo-Tracer instrumentation.

Taskinator uses our own Topo-Tracer framework. It is an explicit node/edge
trace graph, not OpenTelemetry and not a parent/child span tree. A node is a
real lifecycle or function step. An edge is the causal relationship between two
steps. Do not infer graph structure from call nesting alone; connect nodes with
intentional edge labels.

## Model

Every traced GraphQL mutation is one graph rooted at the GraphQL operation.
The graph starts at the API boundary, moves through resolver and domain
service steps, crosses DB/outbox/Kafka infrastructure, and continues into async
consumers/listeners through durable `_trace` metadata in outbox payloads.

The tracing backend is best-effort. A Topo-Tracer outage must never fail a
Taskinator request, outbox relay batch, Kafka publish, consumer, listener, or
domain side effect.

Taskinator sends trace events only. It does not call Topo-Tracer's
`/telemetry/materialize` endpoint; the Topo-Tracer backend worker owns
materialization.

## Coverage

First-pass tracing covers all GraphQL mutations. GraphQL queries are excluded
unless this document is updated to promote a specific query or query family.

Mutation traces must include these lifecycle/function steps when they exist:

- GraphQL mutation operation root.
- Resolver entry for the mutation field.
- Domain service method entry.
- Validation and authorization work.
- Sync automation rule evaluation and action execution.
- DB write or write-CTE step.
- Outbox event insertion.
- Outbox relay claim, relay, and cleanup.
- Kafka publish.
- Kafka consume.
- Aggregator work.
- Listener handler work.
- Downstream service/action calls caused by the event.
- Repair/cascade work such as reachability sync, count repair, orphaning,
  unassignment, and deletion chunks.
- Self-chunking recursive event loops, including every claim, id collection,
  bounded DB chunk, branch decision, continuation outbox insert, relay,
  publish, consume, and final repair step.

Do not add trace nodes for passive object mapping, trivial variable
assignment, or code that does not represent a meaningful lifecycle step.

## Node Names

Use stable, searchable names. Prefer this vocabulary:

| Step | Node name format |
| --- | --- |
| GraphQL root | `GraphQL Mutation <operationName>` |
| Resolver | `Resolver <fieldName>` |
| Domain service | `<Domain>Service.<method>` |
| Database write/read | `DB <operation/entity>` |
| Outbox insert | `Outbox insert <eventType>` |
| Outbox relay | `Outbox relay <stream>/<eventType>` |
| Kafka publish | `Kafka publish <stream>/<eventType>` |
| Kafka consume | `Consumer <groupId> <eventType>` |
| Listener | `Listener <ListenerName>.<handler>` |

Examples:

- `GraphQL Mutation UpdateTask`
- `Resolver updateTask`
- `TaskService.updateTask`
- `DB update project_task`
- `Outbox insert task.updated`
- `Outbox relay task-events/task.updated`
- `Kafka publish task-events/task.updated`
- `Consumer task-aggregator-group task.updated`
- `Listener TaskActivityLogListener.handleUpdated`

## Edge Labels

Edges are the only graph links. Use these labels consistently:

- `calls`: API/resolver/service/helper invokes another meaningful step.
- `validates`: validation or authorization precedes the protected step.
- `writes`: step writes to a database table or durable state.
- `emits`: step creates an outbox/domain event.
- `relays`: outbox relay moves an event toward the bus.
- `publishes`: event bus publishes to Kafka.
- `consumes`: consumer receives an event.
- `aggregates`: aggregator folds raw events into aggregate events.
- `handles`: listener/handler processes a consumed event.
- `cascades`: one domain action triggers follow-up domain actions.
- `repairs`: repair/sync logic restores derived state or counters.

Do not invent a new edge label unless none of these expresses the causal
relationship. If a new label is needed, add it here first.

## Importance Levels

Taskinator uses depth-based importance. Lower numbers are more important.
Unlike the Topo-Tracer examples, Taskinator intentionally allows importance
levels beyond `4`.

Use these anchors:

| Importance | Meaning |
| --- | --- |
| `0` | Root GraphQL mutation. |
| `1` | Resolver and primary domain service step. |
| `2` | Major lifecycle steps: validation, automation, write, outbox, relay, consumer, listener. |
| `3` | First layer of helper/detail work inside a major lifecycle step. |
| `4+` | Deeper nested helper/detail work, increasing by nesting depth. |

Rules for future instrumentation:

- Prefer lower importance for user-visible business lifecycle milestones.
- Let implementation details become less important as nesting increases.
- A helper called from an importance `3` node is usually importance `4`.
- A helper called from that helper is usually importance `5`.
- Do not compress deeply nested work back into `3` just because older examples
  use `0..4`.
- If a low-level helper becomes critical to understanding failures, trace the
  call edge from the higher-level node but keep the helper's depth-derived
  importance.

### Importance Examples

`updateTask` mutation:

| Node | Importance | Edge from previous |
| --- | ---: | --- |
| `GraphQL Mutation UpdateTask` | `0` | - |
| `Resolver updateTask` | `1` | `calls` |
| `TaskService.updateTask` | `1` | `calls` |
| `TaskService.updateTask validate input` | `2` | `validates` |
| `TaskService.runSyncAutomationRules` | `2` | `calls` |
| `AutomationRegistry.evaluateCondition` | `3` | `calls` |
| `AutomationRegistry.allDescendantsInStatus` | `4` | `calls` |
| `DB update project_task` | `2` | `writes` |
| `Outbox insert task.updated` | `2` | `emits` |

Task event continuation:

| Node | Importance | Edge from previous |
| --- | ---: | --- |
| `Outbox relay task-events/task.updated` | `2` | `relays` |
| `Kafka publish task-events/task.updated` | `2` | `publishes` |
| `Consumer task-aggregator-group task.updated` | `2` | `consumes` |
| `TaskEvents_BatchAggregator.handleTaskBatch` | `2` | `aggregates` |
| `Outbox insert task-aggregated.sync-task-reachability` | `3` | `emits` |
| `Listener TaskAggregated_ReachabilitySyncListener.handle` | `2` | `handles` |
| `TaskService.handleTaskReachabilitySync` | `2` | `calls` |
| `DB expand task_reachability` | `3` | `repairs` |

Self-chunking task link/reachability cleanup:

| Node | Importance | Edge from previous |
| --- | ---: | --- |
| `Consumer task-link-decommissioning-group project.aggregated.delete_project_task_link` | `2` | `consumes` |
| `TaskService.handleDeleteProjectTaskLink` | `1` | `calls` |
| `DB claim processed_event task-link-decommissioning-group` | `3` | `validates` |
| `TaskService.collectProjectIds` | `3` | `calls` |
| `DB delete task_link chunk` | `3` | `writes` |
| `Outbox insert project.aggregated.delete_project_task_link_chunk` | `3` | `emits` |
| `Outbox relay project-aggregated/project.aggregated.delete_project_task_link_chunk` | `2` | `relays` |
| `Kafka publish project-aggregated/project.aggregated.delete_project_task_link_chunk` | `2` | `publishes` |
| `Consumer task-link-decommissioning-group project.aggregated.delete_project_task_link_chunk` | `2` | `consumes` |

Repeat the claim/collect/delete/outbox cycle for every full chunk. The final
chunk should still trace the claim, collection, and DB chunk. If the final
branch performs repair instead of emitting another continuation, trace that
repair explicitly, for example `DB recursive reachability repair CTE` with the
`repairs` edge.

Deep helper chain:

| Node | Importance |
| --- | ---: |
| `TaskService.handleDeleteTaskReachability` | `2` |
| `TaskQueries.deleteTaskReachabilityBulk` | `3` |
| `TaskQueries.contractTaskReachability` | `4` |
| `DB recursive reachability repair CTE` | `5` |

## Payload Policy

Trace payloads are debug-rich by default. Payloads may include:

- Entity ids.
- Project, task, team, member, and user ids.
- Project/team names.
- Task titles and descriptions.
- User emails and usernames.
- Statuses, priorities, versions, dates, counts, stream names, event types,
  consumer group names, and listener names.

Always strip secrets:

- Passwords and password hashes.
- JWTs.
- Auth headers.
- Cookies.
- Raw tokens.
- Reset/verification/session tokens.

The internal `_trace` object is transport metadata only. Business logic must
not branch on it, validate it as domain input, expose it in GraphQL responses,
or require it for correctness.

## Async Trace Metadata

Outbox payloads use this internal shape:

```ts
_trace: {
    traceId: string;
    sourceNodeId: string;
    sourceImportance: number;
    edgeLabel: string;
}
```

`traceId` identifies the graph. `sourceNodeId` is the node that emitted or
relayed the async work. `sourceImportance` gives the continuation node a
reasonable default importance. `edgeLabel` describes the causal handoff, such
as `emits`, `relays`, `publishes`, or `consumes`.

Outbox relay and Kafka consumers must preserve `_trace` when publishing and
handling events. If `_trace` is missing, the system should still process the
event normally and may either omit tracing or start a standalone diagnostic
trace, depending on the local tracing helper's behavior.

## Configuration

Runtime configuration:

| Variable | Default | Meaning |
| --- | --- | --- |
| `TOPO_TRACER_URL` | `http://localhost:3999` | Topo-Tracer backend URL. |
| `TOPO_TRACER_SAMPLE_RATE` | `1` | Fraction of GraphQL mutations traced. `1` means 100%. |

Current integration:

Taskinator emits Topo-Tracer-compatible events through an internal tracing
facade, not by calling Topo-Tracer directly from application, domain, GraphQL,
outbox, or Kafka code. Keep that boundary intact.

Tracing code lives under `src/infra/tracing/`:

| File | Responsibility |
| --- | --- |
| `index.ts` | Stable public facade used by the rest of Taskinator. Existing call sites should import from here. |
| `contracts.ts` | Provider port and shared trace types. Add backend-neutral contracts here. |
| `TracingService.ts` | Trace orchestration: async context, root mutation traces, step nodes, edges, resolver/service wrappers, and `_trace` extraction/attachment. |
| `sanitize.ts` | Payload redaction and debug-safe trace data shaping. Keep secret stripping here. |
| `providers/TopoTracerHttpProvider.ts` | Replaceable Topo-Tracer HTTP adapter that batches and sends `POST /telemetry/events`. |

The application-facing API is intentionally small: use helpers such as
`traceMutation`, `traceStep`, `traceService`, `traceResolverMap`,
`attachTraceMetadata`, `extractTraceMetadata`, and
`continueTraceFromMetadata` from `src/infra/tracing/index.ts`.

Topo-Tracer-specific transport logic must stay inside a provider. If Taskinator
later moves from the internal HTTP adapter to the SDK, OpenTelemetry, a local
file sink, or another backend, implement or swap a `TracingProvider` rather
than changing GraphQL resolvers, domain services, outbox relay code, Kafka
consumers, or listeners.

The current Topo-Tracer provider speaks the same `POST /telemetry/events` event
contract as the Topo-Tracer SDK and keeps Taskinator independent from SDK
packaging while the SDK remains in a subdirectory package.

Planned dependency source once the SDK package is installable:

```json
"@topo-tracer/sdk": "https://gitpkg.now.sh/kuchuk-borom-debbarma/Topo-Tracer/sdk/nodejs?main"
```

This GitPkg URL was selected as the Taskinator-only workaround because the
Topo-Tracer SDK package lives in the `sdk/nodejs` subdirectory while npm/Bun
Git dependencies expect a package at the repository root. If GitPkg is
unavailable or the SDK package has no installable build output, keep using the
internal HTTP helper until Topo-Tracer packaging is fixed.

## Review Checklist

Every new mutation instrumentation change must answer:

- What root GraphQL operation does this connect to?
- What lifecycle/function step does this node represent?
- Which existing edge label connects it?
- What is its depth-derived importance?
- Does the payload exclude secrets?
- Does async work preserve `_trace`?
- Would Taskinator still work if Topo-Tracer is unavailable?

Before adding tracing:

- Read this document.
- Add nodes only for real lifecycle/function steps.
- Use Taskinator tracing helper APIs instead of direct SDK calls.
- Keep application and domain code dependent on `src/infra/tracing/index.ts`,
  not on provider classes.
- Put backend-specific transport changes in `src/infra/tracing/providers/`.
- Put shared tracing behavior in `TracingService.ts`, contracts in
  `contracts.ts`, and payload redaction in `sanitize.ts`.
- Keep domain behavior independent from trace metadata.
- Update this document before introducing new node name families, edge labels,
  payload rules, or importance rules.
