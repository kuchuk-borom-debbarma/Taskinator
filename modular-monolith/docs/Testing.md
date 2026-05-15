# Testing Strategy

Taskinator-v2 employs a multi-layered testing strategy to ensure reliability, data integrity, and extreme performance.

## 🧪 Test Layers

### 1. Unit Tests
Focus on individual functions and classes. We mock external dependencies (DB, Kafka) to keep tests fast and deterministic.
- **Location**: `src/modules/**/__tests__`
- **Command**: `bun test`

### 2. Integration & E2E Tests
Verify the entire system flow from the GraphQL API down to the database and Kafka consumers. These tests run against a real infrastructure in Docker.
- **Location**: `src/tests/e2e/`
- **Focus Areas**: Task creation, recursive deletions, member assignments, and trigger execution.

### 3. Stress & Concurrency Tests
Critical for verifying our 10k RPS target and race-condition prevention.
- **Location**: `src/tests/e2e/**/*.stress.test.ts`
- **Focus Areas**: 
    - **Optimistic Locking**: Multiple users updating the same task.
    - **Throughput**: High-volume task creation.
    - **Reachability**: Complex graph updates under load.

## 🛠 Testing Tools

- **Runner**: Bun Test (extremely fast execution).
- **Database**: Each E2E run uses a clean schema or transactional rollback (where supported) to ensure isolation.
- **Mocking**: We use native Bun mocks for third-party service integrations.

## 📈 Performance Benchmarking

We use dedicated stress test suites to measure:
- **P99 Latency**: Targeted at < 50ms for core mutations.
- **Event Lag**: Time from DB write to consumer execution.
- **Throughput**: Verified 10k+ RPS for read/write operations.

```bash
# Example: Run Task Stress Tests
bun test src/tests/e2e/task/task.stress.concurrency.test.ts
```

## 🛡 Quality Gates
All PRs must pass:
1. `bun run lint` (Biome formatting and linting).
2. `bun test` (Unit & E2E suites).
3. `bun test:stress` (Required for changes to core domain services).
