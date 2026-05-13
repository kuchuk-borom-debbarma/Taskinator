---
title: STACK
last_mapped: 2026-05-13
---

# Tech Stack

## Languages & Runtimes

| Layer | Language | Runtime |
|---|---|---|
| Backend (modular-monolith) | TypeScript 5.x | Bun (primary), Node.js (jest tests) |
| Frontend (ui-v1) | TypeScript ~6.0.2 | Browser / Vite |
| DB Schema | SQL (PostgreSQL 16) | PostgreSQL via pg driver |

## Backend — `modular-monolith/`

### Runtime & Execution
- **Bun** (`@types/bun ^1.3.11`) — primary runtime for `dev` and `start` scripts
- Entry: `src/index.ts` → calls `bootstrap()` from `src/app.ts`
- Bootstrap uses `Bun.serve()` with the GraphQL-Yoga fetch handler
- OpenTelemetry preloaded via `--preload ./src/instrumentation.ts`

### Web / API Framework
- **GraphQL Yoga** (`graphql-yoga ^5.21.0`) — HTTP + WebSocket server
- **graphql** `^16.13.2`, **graphql-relay** `^0.10.2` (Relay pagination)
- Schema composed via `@graphql-tools/load-files`, `@graphql-tools/merge`, `@graphql-tools/schema`
- GraphQL schema file: `schema.graphql` (auto-generated via `generate-schema` script)

### Database
- **PostgreSQL 16** (via docker-compose: `taskinator-postgres` on port `5434`)
- **Kysely** `^0.28.14` — SQL query builder, typed via `Database` interface in `src/database/index.ts`
- **pg** `^8.20.0` — underlying pool driver (`Pool` from `pg`)
- Raw SQL tagged template used for complex CTEs (`sql<T>` from Kysely)
- Schema: `modular-monolith/database/schema.sql`
- Tables: `project`, `project_member`, `project_team`, `project_team_member`, `project_task`, `task_link`, `task_reachability`, `processed_event`, `users`, `pending_users`, `outbox_events`

### Message Bus / Event Streaming
- **Redpanda** (Kafka-compatible) via docker-compose — ports `9092` (external), `29092` (internal)
- **KafkaJS** `^2.2.4` — Kafka client
- **MemoryBus** used in tests (`NODE_ENV=test` or `USE_MEMORY_BUS=true`)
- Event bus abstraction: `src/utils/event-bus/` with `KafkaBus.ts` / `MemoryBus.ts` / `types.ts`

### Real-Time / Pub-Sub
- **Redis** 7-alpine via docker-compose (port `6379`)
- **ioredis** `^5.10.1` — publisher/subscriber clients
- `src/redis/RealtimeRedisBridge.ts` — bridges Redis pub-sub to GraphQL subscriptions
- GraphQL subscriptions powered by `graphql-yoga` pub-sub (`src/graphql/pubsub.ts`)

### Auth
- **jsonwebtoken** `^9.0.3` — JWT auth (HS256, secret via `JWT_SECRET` env var)
- Auth handled in `src/graphql/index.ts` (context injection) and `src/modules/auth/`

### Observability / Tracing
- **OpenTelemetry** — `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
- OTLP exporter: `@opentelemetry/exporter-trace-otlp-http`
- Jaeger all-in-one via docker-compose (port `16686` UI, `4318` OTLP/HTTP)
- **Winston** `^3.19.0` — structured logging (`src/logger/index.ts`)

### Utilities
- **DataLoader** `^2.2.3` — batching for GraphQL N+1 prevention (`src/graphql/dls/`)
- **uuid** `^13.0.0` — UUID v4 generation
- **lodash** `^4.17.23` — utility helpers

### Code Quality / Dev Tools
- **Biome** `^2.4.9` — formatter + linter (replaces ESLint/Prettier)
- `biome.json` present in `modular-monolith/`

### Testing
- **Bun test** — E2E tests (`bun test src/tests/e2e`)
- **Jest** `^30.3.0` + **ts-jest** `^29.4.6` — unit tests
- **Supertest** `^7.2.2` — HTTP integration tests
- **Stryker Mutator** `^9.6.1` — mutation testing (configs: `stryker.project-members.config.json`, `stryker.task-flow.config.json`)

## Frontend — `ui-v1/`

### Framework & Build
- **React 19** (`react ^19.2.4`, `react-dom ^19.2.4`)
- **Vite** `^8.0.4` — dev server and bundler
- **TypeScript** `~6.0.2`
- **Tailwind CSS v4** (`tailwindcss ^4.2.2`, `@tailwindcss/vite ^4.2.2`)

### Routing & Data Fetching
- **TanStack Router** `^1.168.22` — type-safe file-based routing
- **TanStack Query** `^5.99.0` — server state management

### GraphQL Client
- **graphql-codegen** — generates typed client from backend schema (`codegen` script)
- Generated types in `src/gql/` (`graphql.ts`, `gql.ts`, `fragment-masking.ts`)
- Adapter pattern: `src/api/adapters/graphql/` implements interfaces from `src/api/interfaces/`

### Visualization
- **@xyflow/react** `^12.10.2` — Task graph rendering (React Flow)
- **d3-force** `^3.0.0` — force-directed graph layout
- **framer-motion** `^12.38.0` — animations
- Web Worker: `src/components/Graph/layoutWorker.ts` — off-main-thread graph layout
- **TanStack Virtual** `^3.13.24` — virtualized lists

### UI Utilities
- **lucide-react** `^1.8.0` — icons
- **clsx** `^2.1.1` + **tailwind-merge** `^3.5.0` — class merging

## Other Sub-projects

### `remotion/`
- Remotion-based video rendering (likely for demo/docs purposes)

### `thesis/`
- Master's thesis document builder using Node.js `docx` library
- Builder scripts in `thesis/builder/sections/`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `DB_NAME` | `test` | Postgres database name |
| `DB_HOST` | `localhost` | Postgres host |
| `DB_USER` | `admin` | Postgres user |
| `DB_PASSWORD` | `password` | Postgres password |
| `DB_PORT` | `5434` | Postgres port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `KAFKA_BROKERS` | — | Kafka broker list (e.g. `localhost:9092`) |
| `JWT_SECRET` | `super-secret-jwt-key` | JWT signing secret |
| `NODE_ENV` | — | `test` triggers MemoryBus |
| `USE_MEMORY_BUS` | `false` | Force MemoryBus for testing |
