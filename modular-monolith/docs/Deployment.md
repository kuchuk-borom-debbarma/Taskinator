# Deployment Guide

Taskinator-v2 is designed to be cloud-native and highly scalable. This guide covers local development setup via Docker and considerations for production deployment.

## 🐳 Local Deployment (Docker)

The easiest way to start all necessary infrastructure is using the provided `docker-compose.yml`.

```bash
cd modular-monolith
docker-compose up -d
```

This will start:
- **PostgreSQL**: Accessible at `localhost:5434`
- **Kafka / Zookeeper**: Accessible at `localhost:9092`
- **Redis**: Accessible at `localhost:6379`
- **Schema Registry**: For Kafka event validation.

## 🚀 Production Considerations

### 1. Horizontal Scaling
The modular monolith can be scaled horizontally by running multiple instances of the server.
- **Sticky Connections**: Real-time subscriptions require the **Targeted Routing** pattern. Ensure all instances share the same Redis cluster to maintain the routing table.
- **Kafka Consumers**: Kafka will automatically balance partitions among all active instances in a consumer group.

### 2. Database Migrations
We use Kysely for type-safe queries. Migrations should be run sequentially during the deployment pipeline before the application starts.

### 3. Monitoring & Observability
- **Logs**: We use a structured JSON logger. In production, these should be forwarded to a central log aggregator (e.g., ELK or Datadog).
- **Metrics**: Monitor Kafka consumer lag and PostgreSQL transaction rates as primary health indicators.

## 📦 Build Process

Taskinator uses **Bun** for its extremely fast startup time and low memory footprint.

```bash
# Install dependencies
bun install

# Run in production mode
bun run src/index.ts
```
