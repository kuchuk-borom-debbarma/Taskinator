---
title: TESTING
last_mapped: 2026-05-13
---

# Testing

## Test Infrastructure Overview

The project uses a **two-tier testing strategy**: E2E tests run against a real database + message bus, while unit tests cover isolated query/service logic.

| Tier | Framework | Runner | Coverage |
|---|---|---|---|
| E2E | Bun test | Bun | Full stack (GraphQL → DB → Kafka → Listeners) |
| Unit | Jest + ts-jest | Node.js | Domain queries and service logic |
| Mutation | Stryker Mutator | Node.js (via npx) | Project members + Task flow |

---

## E2E Tests — `src/tests/e2e/`

### Infrastructure
- **Separate Docker Compose**: `src/tests/e2e/docker-compose.yml`
  - PostgreSQL on port **5435** (isolated from dev's 5434)
  - Kafka (Redpanda) on port **9094** (isolated from dev's 9092)
  - Redis on port **6380** (isolated from dev's 6379)
- **Schema**: Applied via `src/tests/e2e/scripts/apply-schema.ts` before test runs
- **Server**: `src/tests/e2e/helpers/server.ts` calls `bootstrap()` from `app.ts` — 100% production parity

### Running E2E Tests
```bash
# Full E2E run (up → schema → test → down)
bun run test:e2e

# Just the tests (infrastructure already running)
DB_PORT=5435 KAFKA_BROKERS=localhost:9094 REDIS_URL=redis://localhost:6380 \
  bun test src/tests/e2e --concurrency 1

# With coverage
bun run test:e2e:coverage

# Mutation testing (project members)
bun run test:e2e:mutation:project-members

# Mutation testing (task flow)
bun run test:e2e:mutation:task-flow
```

### Test File Organization
```
src/tests/e2e/
├── auth/
│   ├── auth.query.test.ts         # User query tests
│   ├── auth.sign-in.test.ts       # Sign-in flow
│   ├── auth.token.test.ts         # Token validation
│   ├── mutation.ts                # Auth GraphQL mutations
│   └── query.ts                   # Auth GraphQL queries
├── project/
│   ├── project.create.test.ts
│   ├── project.delete.test.ts
│   ├── project.member.add.test.ts
│   ├── project.member.remove.test.ts
│   ├── project.query.batch.test.ts
│   ├── project.query.connection.test.ts
│   ├── project.query.member_connection.test.ts
│   ├── project.query.reachability.test.ts
│   ├── project.query.single.test.ts
│   ├── project.update.test.ts
│   ├── project.stress.create.test.ts      # Stress/concurrency tests
│   ├── project.stress.member.test.ts
│   ├── project.stress.query.test.ts
│   ├── project.stress.volume.test.ts
│   ├── mutation.ts
│   └── query.ts
├── task/
│   ├── task.create.test.ts
│   ├── task.delete.test.ts
│   ├── task.update.test.ts
│   ├── task.link.create.test.ts
│   ├── task.link.delete.test.ts
│   ├── task.link.update.test.ts
│   ├── task.neighbour-links.test.ts
│   ├── task.stress.concurrency.test.ts
│   ├── task.stress.reachability.test.ts
│   └── mutation.ts
├── team/
│   ├── mutation.ts
│   └── query.ts
├── helpers/
│   ├── request.ts                 # HTTP test client (supertest-style)
│   └── server.ts                  # E2E server bootstrap
└── scripts/
    ├── apply-schema.ts            # Run schema.sql on test DB
    ├── volume-seed.ts             # Seed large volumes for stress tests
    ├── add-users.ts
    └── wipe-schema.ts
```

### E2E Test Patterns

```typescript
// Typical E2E test structure
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTestServer } from '../helpers/server';
import { sendMutation } from '../helpers/request';
import { CREATE_PROJECT } from './mutation';

describe('project.create', () => {
    let server: Awaited<ReturnType<typeof createTestServer>>;

    beforeAll(async () => {
        server = await createTestServer();
    });

    afterAll(async () => {
        await server.shutdown();
    });

    it('should create a project with valid params', async () => {
        const res = await sendMutation(server.url, CREATE_PROJECT, {
            name: 'Test Project',
        });
        expect(res.body.data.project.create).toMatchObject({
            name: 'Test Project',
        });
    });
});
```

---

## Unit Tests — Jest

### Config (`jest.config.js`)
```javascript
export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: { '^(\\.{1,2}/.*)\\.ts$': '$1' },
    transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
};
```

### Running Unit Tests
```bash
# Jest unit tests (matches **/*.test.ts)
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --testMatch="**/*.test.ts"
```

### Unit Test Locations
- `src/modules/team/internal/__tests__/TeamQueries.test.ts` — Kysely query tests
- More unit tests may exist under `src/__tests__/`

---

## Mutation Testing — Stryker

### Project Members (`stryker.project-members.config.json`)
- Tests: Project member add/remove E2E tests
- TypeScript checker enabled

### Task Flow (`stryker.task-flow.config.json`)
- Tests: Task link creation/deletion/update E2E tests
- TypeScript checker enabled

### Running Mutation Tests
```bash
# With infrastructure lifecycle management
bun run test:e2e:mutation:project-members   # Full (up + test + down)
bun run test:e2e:mutation:task-flow

# Dry run (checks survivors without full mutation)
bun run test:e2e:mutation:project-members:dry
bun run test:e2e:mutation:task-flow:dry
```

---

## Coverage

- E2E coverage output: `coverage/e2e/` (lcov + text)
- Mutation reports: `reports/mutation/`

---

## Test Bus Strategy

```typescript
// src/utils/event-bus/index.ts
const eventBus: Bus =
    process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_BUS === 'true'
        ? new MemoryBus()   // No Kafka needed for fast unit tests
        : new KafkaBus();   // Full Kafka for E2E
```

E2E tests use `KAFKA_BROKERS=localhost:9094` which connects to the test Redpanda container — **not** MemoryBus.

---

## Stress / Volume Tests

The project includes dedicated stress tests that verify:
- Concurrent project/task creation (`task.stress.concurrency.test.ts`)
- Graph reachability at scale (`task.stress.reachability.test.ts`)
- Volume reads (`project.stress.volume.test.ts`)
- Member operations under load (`project.stress.member.test.ts`)

Volume seeding: `bun run seed:volume` (large dataset) or `bun run seed:volume:small` (small dataset, points to `GQL_URL=http://localhost:3000/graphql`).
