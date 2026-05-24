# Infrastructure Providers

Taskinator keeps domain modules behind service interfaces and infra behind ports.
Concrete tools live in adapters, so Postgres/Kafka/Redis can be replaced without
rewiring module code.

## Ports

Core contracts live in `src/infra/contracts/index.ts`.

- `DatabasePort`: owns the typed Kysely database instance and optional native pool.
- `EventBusPort`: owns the domain event bus contract.
- `EventStorePort`: owns outbox append and idempotency claims.
- `EventRelayPort`: owns background relay lifecycle.
- `CachePort`: owns pub/sub cache clients and instance identity.
- `Infrastructure`: composes database, events, cache, and logger lifecycle.

## Current Adapters

- Database: `PostgresDatabaseProvider`
- Event bus: `KafkaBus` or `MemoryBus`
- Event store: `PostgresEventStoreProvider`
- Event relay: `PostgresOutboxRelay`
- Cache/pub-sub: `IoredisCacheProvider`

Compatibility exports remain:

- `src/infra/database/index.ts`: `db`, `pool`, `databaseProvider`
- `src/infra/utils/EventBus.ts`: default `eventBus`
- `src/infra/utils/event-bus/OutboxQueries.ts`: `appendEventsToOutbox`
- `src/infra/utils/event-bus/idempotency.ts`: `claimEventsAtomic`
- `src/infra/utils/event-bus/OutboxRelay.ts`: relay lifecycle functions
- `src/infra/redis/index.ts`: `getRedisPublisher`, `getRedisSubscriber`, `stopRedis`

## Runtime Selection

Set provider env vars before boot:

```bash
DATABASE_PROVIDER=postgres
EVENT_BUS_PROVIDER=kafka
EVENT_STORE_PROVIDER=postgres
EVENT_RELAY_PROVIDER=postgres
CACHE_PROVIDER=ioredis
```

Tests still default to `EVENT_BUS_PROVIDER=memory` through `NODE_ENV=test`.

## Adding Cloudflare

Add adapter classes that implement the same ports:

- D1/Hyperdrive adapter implements `DatabasePort`.
- Queues/Pub/Sub adapter implements `EventBusPort` by exposing a `Bus`.
- D1/Durable Object backed outbox implements `EventStorePort`.
- Cron/Queue worker implements `EventRelayPort`.
- KV/Durable Object adapter implements `CachePort` if Redis behavior is needed.

Then extend the matching provider factory:

- `src/infra/database/index.ts`
- `src/infra/utils/event-bus/index.ts`
- `src/infra/events/index.ts`
- `src/infra/redis/index.ts`

No domain module should import Cloudflare SDKs directly. SDK imports belong only
inside adapter files.

## Boundary Rules

- Domain modules may use service interfaces and generic event constants.
- Domain modules must not import concrete SDKs such as `pg`, `ioredis`,
  `kafkajs`, or Cloudflare packages.
- Physical persistence details belong in provider adapters.
- Existing compatibility facades are allowed during migration, but new code
  should depend on ports or module services.
