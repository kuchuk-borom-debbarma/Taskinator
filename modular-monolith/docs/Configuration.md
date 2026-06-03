# Configuration Guide

This document outlines the environment variables and infrastructure settings required to run Taskinator-v2.

## 🔑 Environment Variables

Create a `.env` file in the `modular-monolith/` directory based on the following template:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_NAME` | PostgreSQL Database Name | `test` |
| `DB_HOST` | PostgreSQL Host | `localhost` |
| `DB_USER` | PostgreSQL Username | `admin` |
| `DB_PASSWORD` | PostgreSQL Password | — |
| `DB_PORT` | PostgreSQL Port | `5434` |
| `KAFKA_BROKERS` | Comma-separated Kafka broker addresses | `localhost:9092` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing Auth tokens | — |
| `TOPO_TRACER_URL` | Topo-Tracer backend URL for best-effort mutation lifecycle tracing | `http://localhost:3999` |
| `TOPO_TRACER_SAMPLE_RATE` | Fraction of GraphQL mutations to trace. `1` means 100%. | `1` |

## 🏗 Infrastructure Requirements

To run Taskinator-v2 in production or staging, you need the following services:

### 1. PostgreSQL (v15+)
Used for primary persistent storage. Requires the `pg_trgm` extension for optimized text searching and `uuid-ossp` for ID generation.

### 2. Kafka (v3+)
Used as the event backbone. We recommend a minimum of 3 partitions per topic for horizontal scalability.

### 3. Redis (v7+)
Used for real-time routing tables and local pub/sub bridging. Must be configured with persistence (RDB/AOF) disabled for maximum speed, as it handles volatile routing data.

## ⚙️ Service-Specific Configs

### Outbox Relay
The Outbox Relay polling interval and batch size can be adjusted in `src/utils/event-bus/OutboxRelay.ts`. Default is 100ms and 100 events per batch.

### Kafka Consumer Groups
Each domain module uses its own Kafka consumer group (e.g., `taskinator-task-group`, `taskinator-project-group`) to allow for independent scaling.

### Topo-Tracer
Taskinator's tracing rules are documented in [Tracing](./Tracing.md). Tracing is best-effort: Topo-Tracer outages must not fail requests, event relay work, Kafka consumers, or domain side effects.
