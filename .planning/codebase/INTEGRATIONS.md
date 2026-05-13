---
title: INTEGRATIONS
last_mapped: 2026-05-13
---

# External Integrations

## Infrastructure Services (Docker Compose)

All services defined in `modular-monolith/docker-compose.yml`.

### PostgreSQL 16
- **Image**: `postgres:16-alpine`
- **Container**: `taskinator-postgres`
- **Port**: `5434:5432`
- **Credentials**: `admin` / `password` / db: `test`
- **Init Script**: `database/schema.sql` mounted at `/docker-entrypoint-initdb.d/init.sql`
- **Used via**: Kysely (`src/database/index.ts`) with pg `Pool` (max 10 connections, 30s idle timeout)
- **Health check**: `pg_isready -U admin -d test` (5s interval)

### Redpanda (Kafka-compatible)
- **Image**: `docker.redpanda.com/redpandadata/redpanda:v24.1.2`
- **Container**: `taskinator-redpanda`
- **Ports**: `9092` (external), `29092` (internal PLAINTEXT)
- **Client**: KafkaJS `^2.2.4`
- **Configuration**: `KAFKA_BROKERS` env var (defaults to `localhost:9092` in dev)
- **Used for**: Transactional Outbox → Event Bus → Smart Aggregator Consumers
- **Console UI**: Redpanda Console v2.5.2 on port `8081`

### Redis 7
- **Image**: `redis:7-alpine`
- **Container**: `taskinator-redis`
- **Port**: `6379:6379`
- **Client**: ioredis `^5.10.1`
- **`REDIS_URL`**: `redis://localhost:6379`
- **Used for**: Real-time pub-sub bridge between Kafka events and GraphQL subscriptions
- **Two clients**: Publisher + Subscriber (separate ioredis connections)
- **Bridge**: `src/redis/RealtimeRedisBridge.ts`

### Jaeger (OpenTelemetry Tracing)
- **Image**: `jaegertracing/all-in-one:latest`
- **Container**: `taskinator-jaeger`
- **Ports**: `16686` (UI), `4318` (OTLP/HTTP)
- **Client**: `@opentelemetry/exporter-trace-otlp-http`
- **Auto-instrumentation**: `@opentelemetry/auto-instrumentations-node`
- **Preloaded**: `src/instrumentation.ts` via `bun --preload`

## E2E Test Infrastructure

Separate docker-compose for tests at `src/tests/e2e/docker-compose.yml`:
- PostgreSQL on port `5435` (isolated from dev)
- Kafka on port `9094` (isolated from dev)
- Redis on port `6380` (isolated from dev)

## GraphQL API (Backend → Frontend)

- **Server**: GraphQL Yoga on port `3000` (or `$PORT`)
- **Endpoint**: `http://localhost:3000/graphql`
- **Schema**: Generated via `bun run generate-schema` → `schema.graphql`
- **Client codegen**: `graphql-codegen` in `ui-v1/` generates typed hooks (`src/gql/`)
- **Auth**: Bearer token in `Authorization` header OR `?token=<jwt>` query param
- **Subscriptions**: WebSocket (via graphql-yoga built-in)

## Event Bus (Internal Integration Pattern)

```
                  DB Write
 Service Mutation ──────────── outbox_events table
                                      │
                              OutboxRelay (LISTEN/NOTIFY)
                                      │
                              KafkaBus.publish()
                                      │
                        ┌─────────────┴───────────────┐
                        │  Smart Aggregator Consumer   │
                        │  (ProjectEvents_BatchAggregator, etc.)
                        └─────────────┬───────────────┘
                                      │  PROJECT_AGGREGATED topic
                         ┌────────────┴─────────────┐
                    Execution Listeners (per domain)
```

### Kafka Topics (from `src/utils/event-bus/constants.ts`)
- `PROJECT` — raw project domain events (CREATED, DELETED, MEMBERS_ADDED, MEMBERS_REMOVED)
- `PROJECT_AGGREGATED` — aggregated signals (CHANGE_PROJECT_MEMBER_COUNT, etc.)
- `TASK` — task domain events
- `TASK_AGGREGATED` — aggregated task signals
- `TEAM` — team domain events  
- `TEAM_AGGREGATED` — aggregated team signals

## Authentication

- **JWT (HS256)** — `jsonwebtoken ^9.0.3`
- Secret: `process.env.JWT_SECRET || 'super-secret-jwt-key'`
- Token injected into GraphQL context as `userId` for all resolver authorization
- No external auth provider — self-hosted user registration flow via `auth` module
- `pending_users` table for pre-registration state

## No External Third-Party APIs

The system is entirely self-hosted. No integrations with:
- No payment processors
- No email providers (external notification module appears internal)
- No object storage (S3, etc.)
- No external identity providers (Auth0, Cognito, etc.)
