# Development Guide

This guide covers the standards and workflows for contributing to Taskinator-v2.

## 🛠 Coding Standards

- **Language**: TypeScript (Strict mode enabled).
- **Style**: We use [Biome](https://biomejs.dev/) for formatting and linting. Run `bun run lint` before committing.
- **Service Pattern**: Always follow the [Modular Monolith Design](./Modular-Monolith-Design.md) (Interface in `Service.ts`, Implementation in `internal/`).
- **Naming**: Use `PascalCase` for classes/interfaces, `camelCase` for variables/functions, and `kebab-case` for file names (except for class files).

## 🗄 Working with the Database

We use **Kysely** for type-safe SQL. 
- **Schema**: Table definitions are located in `src/database/tables/`.
- **Queries**: Complex queries should be encapsulated in `internal/{Domain}Queries.ts` files within their respective modules.
- **Transactions**: Use wCTEs for atomic updates and event outbox inserts whenever possible to avoid locking overhead.

## 📡 Working with Events

- **Adding a New Event**:
    1. Define the event payload in `src/types/events.ts`.
    2. Add the event emission logic to the domain service using `eventBus.publish()`.
    3. Register a new listener in `src/kafka/registry.ts`.
- **Idempotency**: Always ensure your consumer logic is idempotent. Check the `processed_event` table before executing side effects.
- **Tracing**: Before adding or changing mutation, outbox, Kafka, aggregator, listener, or cascade instrumentation, read the [Topo-Tracer Instrumentation Contract](./Tracing.md). It defines coverage, node names, edge labels, importance levels, payload rules, and async `_trace` propagation.

## 🧪 Testing Workflow

- **Unit Tests**: Place next to the source file (e.g., `UserService.test.ts`).
- **E2E Tests**: Located in `src/tests/e2e/`. These require a running infrastructure (Docker).
- **Stress Tests**: Use these to verify performance targets (10k RPS).

```bash
# Run all tests
bun test

# Run a specific suite
bun test src/tests/e2e/task
```

## 🚀 Committing Changes

We follow conventional commits. 
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
