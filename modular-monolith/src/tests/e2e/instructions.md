# Taskinator E2E Testing Guide

This directory (`src/tests/e2e`) contains the End-to-End (E2E) testing suite for the Taskinator modular monolith. 

The E2E tests run against a completely **isolated infrastructure environment** (using `tmpfs` for lightning-fast, RAM-based database operations) to ensure tests never conflict with your local development state.

## 🚀 The Automated Way (Recommended)

To run the entire E2E suite seamlessly from start to finish, simply run:

```bash
bun run test:e2e
```

**What this command does automatically:**
1. Spins up the E2E isolated Docker containers (Postgres, Kafka, Redis).
2. Waits until the PostgreSQL database is perfectly healthy.
3. Automatically applies `schema.sql` to create fresh tables.
4. Executes all `*.test.ts` files inside this directory.
5. Safely tears down the containers and wipes the in-memory state.

---

## 🛠 The Manual Way (For Debugging / Scripting)

If you are writing a new test, debugging a failure, or want to interact with the E2E database directly, you can control the lifecycle manually.

### 1. Start the Isolated Environment
```bash
bun run test:e2e:up
```
*Note: The E2E environment runs on alternate ports to avoid conflicts: Postgres (`5435`), Kafka (`9094`), Redis (`6380`).*

### 2. Apply the Database Schema
```bash
DB_PORT=5435 bun run src/tests/e2e/scripts/apply-schema.ts
```

### 3. (Optional) Seed Fake Users
If you want to manually seed users into the E2E database to test queries:
```bash
DB_PORT=5435 bun run src/tests/e2e/scripts/add-users.ts 100
```
*(This will insert 100 sequential base-26 alphabetical users: `a@a.a`, `b@a.a`, etc.)*

### 4. Run Tests Manually
Because the test runner needs the E2E environment variables, you must inject them:
```bash
DB_PORT=5435 KAFKA_BROKERS=localhost:9094 REDIS_URL=redis://localhost:6380 node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand src/tests/e2e/**/*.test.ts
```

### 5. Tear Down the Environment
When you're finished, wipe the containers and clear the RAM:
```bash
bun run test:e2e:down
```

---

## 🏗 Writing a New Test

Create a new file ending in `.test.ts` (e.g. `user-flow.test.ts`).

1. Use `supertest` pointing to `createServer(yoga)` to invoke GraphQL endpoints directly.
2. After the endpoint resolves, use `db` (from `src/database/index.ts`) or `sql` raw queries to immediately query the database and assert that the internal state changed correctly.

Example:
```typescript
import { createServer } from 'http';
import request from 'supertest';
import { yoga } from '../../graphql';
import { db } from '../../database';

const server = createServer(yoga);

test('It creates a project', async () => {
    // 1. Hit the GraphQL endpoint
    const res = await request(server).post('/graphql').send({ ... });
    
    // 2. Query the Database to verify
    const projectInDb = await db.selectFrom('project').selectAll().executeTakeFirst();
    expect(projectInDb).toBeDefined();
});
```
