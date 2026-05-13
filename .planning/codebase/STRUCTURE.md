# Codebase Structure

**Analysis Date:** 2026-05-13

## Directory Layout

```text
Taskinator-v2/
├── modular-monolith/        # Bun backend, GraphQL API, domain modules, database, tests
│   ├── database/            # SQL schema and migrations
│   ├── docs/                # Backend/project docs
│   ├── src/                 # Backend TypeScript source
│   │   ├── database/        # Kysely connection and table types
│   │   ├── graphql/         # Yoga setup, schema, resolvers, DataLoaders
│   │   ├── kafka/           # Consumer registry and smart aggregators
│   │   ├── modules/         # Domain modules and listeners
│   │   ├── redis/           # Redis clients and realtime bridge
│   │   ├── tests/e2e/       # Bun E2E tests and test infra
│   │   ├── utils/           # Event bus and shared backend helpers
│   │   └── index.ts         # Backend production entry
│   └── package.json         # Backend scripts and dependencies
├── taskinator-web/          # Current Vite React frontend
│   ├── public/              # Static public assets
│   ├── src/                 # Current frontend source
│   │   ├── components/      # Shared/feature UI components
│   │   ├── features/        # Feature-level views
│   │   ├── graphql/         # GraphQL client and operation documents
│   │   ├── hooks/           # React/Zustand hooks
│   │   ├── layouts/         # App layout shells
│   │   ├── store/           # Zustand stores
│   │   ├── styles/          # Design tokens
│   │   ├── types/           # Frontend TypeScript types
│   │   └── main.tsx         # Frontend entry
│   └── package.json         # Frontend scripts and dependencies
├── ui-v1/                   # Legacy Vite frontend with API adapter layer and generated gql
├── remotion/                # Remotion architecture/video project
├── thesis/                  # Thesis/report builder, diagrams, generated documents
├── reactjs-web/             # Additional built/static React app artifact
├── .planning/codebase/      # Generated GSD codebase maps
├── README.md                # Repository overview
├── PR.md                    # Pull request notes
└── Dev-journal.md           # Development journal
```

## Directory Purposes

**`modular-monolith`:**
- Purpose: Backend application and primary domain architecture.
- Contains: Bun/TypeScript source, GraphQL API, Kysely/Postgres integration, Kafka/Redis eventing, tests, database schema.
- Key files: `modular-monolith/src/index.ts`, `modular-monolith/src/app.ts`, `modular-monolith/package.json`, `modular-monolith/tsconfig.json`.

**`modular-monolith/src/graphql`:**
- Purpose: GraphQL boundary and request-layer composition.
- Contains: `index.ts` Yoga setup, `context.ts`, `schema.ts`, SDL under `schema/`, resolver maps under `resolvers/`, DataLoaders under `dls/`, GraphQL errors, PubSub.
- Key files: `modular-monolith/src/graphql/index.ts`, `modular-monolith/src/graphql/schema.ts`, `modular-monolith/src/graphql/resolvers/index.ts`, `modular-monolith/src/graphql/dls/index.ts`.

**`modular-monolith/src/modules`:**
- Purpose: Domain module layer for auth, projects, tasks, teams, external notifications, and internal notifications.
- Contains: Public service interfaces/types, singleton exports, internal service implementations, SQL query modules, event listeners.
- Key files: `modular-monolith/src/modules/project/ProjectService.ts`, `modular-monolith/src/modules/project/internal/ProjectServiceImpl.ts`, `modular-monolith/src/modules/project/internal/ProjectQueries.ts`, `modular-monolith/src/modules/task/internal/TaskQueries.ts`, `modular-monolith/src/modules/team/internal/TeamQueries.ts`.

**`modular-monolith/src/modules/*/internal/listeners`:**
- Purpose: Event-driven side effects owned by the affected module.
- Contains: Cleanup listeners, denormalized counter sync listeners, reachability sync listeners, membership purge/unassignment listeners.
- Key files: `modular-monolith/src/modules/task/internal/listeners/TaskAggregated_ReachabilitySyncListener.ts`, `modular-monolith/src/modules/project/internal/listeners/TaskAggregated_SyncProjectTaskCountListener.ts`, `modular-monolith/src/modules/team/internal/listeners/TeamAggregated_SyncTeamMemberCountListener.ts`.

**`modular-monolith/src/database`:**
- Purpose: Typed database access.
- Contains: Kysely `Database` interface, `pg` pool setup, table type declarations, migration runner.
- Key files: `modular-monolith/src/database/index.ts`, `modular-monolith/src/database/tables/Project.ts`, `modular-monolith/src/database/tables/ProjectTask.ts`, `modular-monolith/src/database/runMigration.ts`.

**`modular-monolith/database`:**
- Purpose: SQL schema and migration files.
- Contains: Base schema and migration scripts for graph links, DSL rename, automation naming.
- Key files: `modular-monolith/database/schema.sql`, `modular-monolith/database/migration_graph_links_v2.sql`, `modular-monolith/database/migration_dsl_rename.sql`.

**`modular-monolith/src/utils/event-bus`:**
- Purpose: Event bus abstraction and outbox processing.
- Contains: `KafkaBus`, `MemoryBus`, event constants/types, idempotency helpers, outbox queries, outbox relay.
- Key files: `modular-monolith/src/utils/event-bus/index.ts`, `modular-monolith/src/utils/event-bus/OutboxRelay.ts`, `modular-monolith/src/utils/event-bus/KafkaBus.ts`, `modular-monolith/src/utils/event-bus/MemoryBus.ts`.

**`modular-monolith/src/kafka`:**
- Purpose: Long-lived event consumers and event aggregation.
- Contains: Consumer registry and smart aggregator consumers by domain.
- Key files: `modular-monolith/src/kafka/registry.ts`, `modular-monolith/src/kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts`, `modular-monolith/src/kafka/smart-aggregator-consumer/task/TaskEvents_BatchAggregator.ts`, `modular-monolith/src/kafka/smart-aggregator-consumer/team/TeamEvents_BatchAggregator.ts`.

**`modular-monolith/src/redis`:**
- Purpose: Redis client singletons and targeted realtime bridge.
- Contains: Publisher/subscriber helpers and GraphQL PubSub bridge.
- Key files: `modular-monolith/src/redis/index.ts`, `modular-monolith/src/redis/RealtimeRedisBridge.ts`.

**`modular-monolith/src/tests/e2e`:**
- Purpose: Backend E2E test suites using real GraphQL requests and dockerized dependencies.
- Contains: Domain test folders, GraphQL helpers, server helper, schema scripts, seed scripts, E2E docker compose file.
- Key files: `modular-monolith/src/tests/e2e/helpers/server.ts`, `modular-monolith/src/tests/e2e/helpers/request.ts`, `modular-monolith/src/tests/e2e/docker-compose.yml`.

**`taskinator-web`:**
- Purpose: Current frontend application.
- Contains: Vite config, React source, Tailwind v4 styles, GraphQL client, routes, components, hooks, stores.
- Key files: `taskinator-web/src/main.tsx`, `taskinator-web/src/App.tsx`, `taskinator-web/src/routes.tsx`, `taskinator-web/package.json`.

**`taskinator-web/src/components`:**
- Purpose: Current UI components used by routes/features.
- Contains: Auth, project sidebar, header, modal system, task/team views, relationship widgets, notification panel, user search.
- Key files: `taskinator-web/src/components/Auth.tsx`, `taskinator-web/src/components/TaskListView.tsx`, `taskinator-web/src/components/TeamGrid.tsx`, `taskinator-web/src/components/TaskDetailView.tsx`, `taskinator-web/src/components/GlobalModals.tsx`.

**`taskinator-web/src/features`:**
- Purpose: Feature-level screens that compose components and server data.
- Contains: Workspace project dashboard.
- Key files: `taskinator-web/src/features/workspace/ProjectDashboard.tsx`.

**`taskinator-web/src/graphql`:**
- Purpose: Frontend GraphQL transport and operation documents.
- Contains: `GraphQLClient` setup and gql query/mutation/subscription strings.
- Key files: `taskinator-web/src/graphql/client.ts`, `taskinator-web/src/graphql/operations.ts`.

**`taskinator-web/src/hooks`:**
- Purpose: Frontend reusable hooks and stores with hook APIs.
- Contains: Auth state, realtime EventSource integration, sliding window pagination.
- Key files: `taskinator-web/src/hooks/useAuth.ts`, `taskinator-web/src/hooks/useRealtime.ts`, `taskinator-web/src/hooks/useSlidingWindow.ts`.

**`ui-v1`:**
- Purpose: Legacy frontend implementation.
- Contains: Vite React app, context providers, generated GraphQL types, API adapter interfaces, graph UI, project/task/team views.
- Key files: `ui-v1/src/main.tsx`, `ui-v1/src/router.tsx`, `ui-v1/src/context/ApiContext.tsx`, `ui-v1/src/api/adapters/graphql/GraphQLProjectAPI.ts`, `ui-v1/src/gql/graphql.ts`.

**`remotion`:**
- Purpose: Remotion video/animation project for architecture and thesis material.
- Contains: Remotion compositions, visual components, scripts, package manifest.
- Key files: `remotion/src/Root.tsx`, `remotion/src/index.ts`, `remotion/src/Composition.tsx`, `remotion/remotion.config.ts`.

**`thesis`:**
- Purpose: Thesis/report generation and diagram assets.
- Contains: Builder scripts, section modules, diagrams, generated `.docx`/PDF assets.
- Key files: `thesis/builder/index.js`, `thesis/builder/utils.js`, `thesis/builder/sections/*`, `thesis/diagrams/*`.

## Key File Locations

**Entry Points:**
- `modular-monolith/src/index.ts`: Backend production entry and `Bun.serve` startup.
- `modular-monolith/src/app.ts`: Shared bootstrap/shutdown path for production and E2E tests.
- `modular-monolith/src/graphql/index.ts`: GraphQL Yoga server configuration.
- `taskinator-web/src/main.tsx`: Current frontend React mount.
- `taskinator-web/src/App.tsx`: React Query provider and Router provider.
- `taskinator-web/src/routes.tsx`: Current frontend route tree.
- `ui-v1/src/main.tsx`: Legacy frontend React mount.
- `remotion/src/index.ts`: Remotion registration entry.
- `thesis/builder/index.js`: Thesis document generation entry.

**Configuration:**
- `modular-monolith/package.json`: Backend scripts and dependencies.
- `modular-monolith/tsconfig.json`: Backend TypeScript config.
- `modular-monolith/database/schema.sql`: Backend database schema.
- `taskinator-web/package.json`: Current frontend scripts and dependencies.
- `taskinator-web/vite.config.ts`: Current frontend Vite config.
- `taskinator-web/tsconfig.json`, `taskinator-web/tsconfig.app.json`, `taskinator-web/tsconfig.node.json`: Current frontend TypeScript configs.
- `taskinator-web/eslint.config.js`: Current frontend lint config.
- `ui-v1/package.json`, `ui-v1/vite.config.ts`, `ui-v1/tsconfig.json`: Legacy frontend config.
- `remotion/package.json`, `remotion/remotion.config.ts`, `remotion/tsconfig.json`: Remotion project config.
- `thesis/package.json`: Thesis builder dependencies.

**Core Logic:**
- `modular-monolith/src/graphql/resolvers/*.ts`: GraphQL resolver implementation.
- `modular-monolith/src/graphql/schema/*.graphql`: GraphQL schema files.
- `modular-monolith/src/graphql/dls/*.ts`: Request-scoped DataLoader definitions.
- `modular-monolith/src/modules/*/*Service.ts`: Domain interfaces and public domain types.
- `modular-monolith/src/modules/*/internal/*ServiceImpl.ts`: Domain service implementation classes.
- `modular-monolith/src/modules/*/internal/*Queries.ts`: SQL persistence and authorization logic.
- `modular-monolith/src/modules/*/internal/listeners/*.ts`: Event-driven cross-domain side effects.
- `modular-monolith/src/utils/event-bus/OutboxRelay.ts`: Transactional outbox relay.
- `modular-monolith/src/kafka/registry.ts`: Consumer/listener lifecycle registration.
- `taskinator-web/src/graphql/operations.ts`: Frontend GraphQL operation catalog.
- `taskinator-web/src/features/workspace/ProjectDashboard.tsx`: Current dashboard feature.
- `taskinator-web/src/components/TaskListView.tsx`: Current task list feature UI.
- `taskinator-web/src/components/TeamGrid.tsx`: Current team feature UI.

**Testing:**
- `modular-monolith/src/__tests__/*.test.ts`: Backend unit/integration-style Jest tests for eventing/performance.
- `modular-monolith/src/__tests__/helpers/*.ts`: Backend test helpers.
- `modular-monolith/src/tests/e2e/**/*.test.ts`: Backend E2E tests organized by domain.
- `modular-monolith/src/tests/e2e/helpers/server.ts`: E2E server bootstrap helper.
- `modular-monolith/src/tests/e2e/helpers/request.ts`: E2E GraphQL request helper.
- `modular-monolith/src/tests/e2e/scripts/*.ts`: E2E schema and seed scripts.
- `modular-monolith/src/tests/e2e/docker-compose.yml`: E2E dependency stack; note existence only when handling secrets.

## Naming Conventions

**Files:**
- Backend entry/config files use lowercase or camelCase: `modular-monolith/src/app.ts`, `modular-monolith/src/instrumentation.ts`, `modular-monolith/src/database/runMigration.ts`.
- Backend service interfaces use PascalCase with `Service`: `modular-monolith/src/modules/project/ProjectService.ts`, `modular-monolith/src/modules/task/TaskService.ts`.
- Backend service implementations use PascalCase plus `Impl`: `modular-monolith/src/modules/project/internal/ProjectServiceImpl.ts`.
- Backend query modules use PascalCase plus `Queries`: `modular-monolith/src/modules/project/internal/ProjectQueries.ts`.
- Backend table type files use entity PascalCase: `modular-monolith/src/database/tables/Project.ts`, `modular-monolith/src/database/tables/TaskLink.ts`.
- Backend event listener files encode event source and action: `modular-monolith/src/modules/task/internal/listeners/ProjectAggregated_DeleteProjectTask.ts`.
- GraphQL SDL files use domain folders and kebab suffixes: `modular-monolith/src/graphql/schema/project/project-extension.graphql`.
- Frontend React components use PascalCase `.tsx`: `taskinator-web/src/components/TaskNode.tsx`, `taskinator-web/src/layouts/WorkspaceLayout.tsx`.
- Frontend hooks use `use*.ts`: `taskinator-web/src/hooks/useAuth.ts`, `taskinator-web/src/hooks/useRealtime.ts`.
- Frontend utility files use lowercase concise names: `taskinator-web/src/utils/cn.ts`, `taskinator-web/src/utils/color.ts`.
- Tests use `.test.ts`: `modular-monolith/src/tests/e2e/project/project.create.test.ts`.

**Directories:**
- Backend domain modules are singular nouns under `modular-monolith/src/modules`: `project`, `task`, `team`, `auth`.
- Backend internal implementation details stay under `internal`: `modular-monolith/src/modules/project/internal`.
- Backend GraphQL schema groups use domain names: `modular-monolith/src/graphql/schema/task`, `modular-monolith/src/graphql/schema/team`.
- Current frontend groups by app concern: `components`, `features`, `graphql`, `hooks`, `layouts`, `store`, `types`, `utils`.
- Legacy frontend has an adapter/interface API structure under `ui-v1/src/api/adapters` and `ui-v1/src/api/interfaces`.

## Where to Add New Code

**New Backend Domain Feature:**
- Primary code: Add interface/types to `modular-monolith/src/modules/<domain>/<Domain>Service.ts`.
- Implementation: Add behavior to `modular-monolith/src/modules/<domain>/internal/<Domain>ServiceImpl.ts`.
- Persistence: Add SQL functions to `modular-monolith/src/modules/<domain>/internal/<Domain>Queries.ts`.
- Export: Update `modular-monolith/src/modules/<domain>/index.ts`.
- GraphQL API: Add SDL under `modular-monolith/src/graphql/schema/<domain>` and resolver code under `modular-monolith/src/graphql/resolvers/<domain>.ts`; register resolver in `modular-monolith/src/graphql/resolvers/index.ts`.
- Tests: Add E2E tests under `modular-monolith/src/tests/e2e/<domain>` and shared helpers only under `modular-monolith/src/tests/e2e/helpers`.

**New Backend Entity/Table:**
- Schema: Update `modular-monolith/database/schema.sql` or add a migration file under `modular-monolith/database`.
- Types: Add table type declaration under `modular-monolith/src/database/tables/<Entity>.ts`.
- Database interface: Add the table to `modular-monolith/src/database/index.ts`.
- Query code: Access it from the owning module's `internal/*Queries.ts`.

**New Backend Event Side Effect:**
- Event emission: Insert outbox rows from the owning mutation query in `modular-monolith/src/modules/<domain>/internal/<Domain>Queries.ts`.
- Constants/types: Extend `modular-monolith/src/utils/event-bus/constants.ts` and `modular-monolith/src/utils/event-bus/types.ts`.
- Consumer/listener: Add listener under the module that owns the affected data, such as `modular-monolith/src/modules/task/internal/listeners`.
- Registration: Instantiate and initialize the listener in `modular-monolith/src/kafka/registry.ts`.

**New DataLoader:**
- Implementation: Add loader factory in `modular-monolith/src/graphql/dls/<domain>.ts`.
- Registration: Add it to `createLoaders()` in `modular-monolith/src/graphql/dls/index.ts`.
- Usage: Use it from resolvers through `context.loaders.<domain>`.

**New Current Frontend Route:**
- Route definition: Add route in `taskinator-web/src/routes.tsx`.
- Page/feature view: Put screen-level code under `taskinator-web/src/features/<feature>`.
- Layout reuse: Use `taskinator-web/src/layouts/WorkspaceLayout.tsx` for workspace pages.
- Data: Add GraphQL documents to `taskinator-web/src/graphql/operations.ts` and call them through `taskinator-web/src/graphql/client.ts`.

**New Current Frontend Component:**
- Implementation: Add reusable UI to `taskinator-web/src/components/<ComponentName>.tsx`.
- Feature-specific composition: Prefer `taskinator-web/src/features/<feature>` for page-level orchestration.
- Types: Put shared frontend types in `taskinator-web/src/types/index.ts`.
- Utilities: Put shared helpers in `taskinator-web/src/utils`.

**New Current Frontend State:**
- Server state: Use React Query in route/components and keep query keys consistent with existing keys in `taskinator-web/src/routes.tsx` and `taskinator-web/src/components/TaskListView.tsx`.
- Local UI state: Extend `taskinator-web/src/store/ui.ts`.
- Auth state: Extend `taskinator-web/src/hooks/useAuth.ts` only for authentication/session behavior.

**New Realtime Frontend Behavior:**
- Backend subscription/PubSub: Update `modular-monolith/src/graphql/schema/realtime.graphql`, `modular-monolith/src/graphql/resolvers/realtime.ts`, and `modular-monolith/src/graphql/pubsub.ts`.
- Frontend EventSource handling: Extend `taskinator-web/src/hooks/useRealtime.ts`.
- Cache updates: Invalidate or update React Query caches from `taskinator-web/src/hooks/useRealtime.ts`.

**Utilities:**
- Backend shared helpers: `modular-monolith/src/utils`.
- Backend shared types: `modular-monolith/src/types`.
- Frontend shared helpers: `taskinator-web/src/utils`.
- Frontend shared types: `taskinator-web/src/types`.

## Special Directories

**`.planning/codebase`:**
- Purpose: GSD-generated codebase maps consumed by future planning/execution commands.
- Generated: Yes
- Committed: Yes

**`modular-monolith/coverage`:**
- Purpose: Backend coverage reports.
- Generated: Yes
- Committed: Not determined from architecture scan.

**`modular-monolith/reports`:**
- Purpose: Backend analysis/test/mutation reports.
- Generated: Yes
- Committed: Not determined from architecture scan.

**`modular-monolith/graphify-out`:**
- Purpose: Graph/codebase analysis output.
- Generated: Yes
- Committed: Not determined from architecture scan.

**`modular-monolith/temp`:**
- Purpose: Temporary workspace with dependencies/venv artifacts.
- Generated: Yes
- Committed: Not determined from architecture scan.

**`taskinator-web/dist`:**
- Purpose: Built frontend output.
- Generated: Yes
- Committed: Not determined from architecture scan.

**`ui-v1/src/gql`:**
- Purpose: Generated GraphQL client/types for the legacy frontend.
- Generated: Yes
- Committed: Yes

**`ui-v1/dist`:**
- Purpose: Legacy frontend build output.
- Generated: Yes
- Committed: Not determined from architecture scan.

**`remotion`:**
- Purpose: Separate media/documentation app with its own package, config, and source tree.
- Generated: No
- Committed: Yes

**`thesis/builder`:**
- Purpose: Thesis document generation scripts and section modules.
- Generated: No
- Committed: Yes

**`thesis/diagrams`:**
- Purpose: Diagram/image assets for thesis/report generation.
- Generated: Mixed
- Committed: Yes

**`node_modules` directories:**
- Purpose: Installed package dependencies in subprojects.
- Generated: Yes
- Committed: Not determined from architecture scan.

---

*Structure analysis: 2026-05-13*
