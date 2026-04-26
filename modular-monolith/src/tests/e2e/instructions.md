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

To measure which E2E paths are actually exercised, run:

```bash
bun run test:e2e:coverage
```

This writes Bun coverage output to `coverage/e2e` and prints a text summary in the terminal.

To pressure-test important query branches with mutation testing, run:

```bash
bun run test:e2e:mutation
```

This currently targets the most critical write paths covered by the E2E suite:
- project member add/remove
- task create/update

---

## 🛠 The Manual Way (For Debugging / Scripting)

If you are writing a new test, debugging a failure, or want to interact with the E2E database directly, you can control the lifecycle manually using these scripts:

### 1. Open the Isolated Environment
```bash
bun run test:e2e:open
```
*What this does: Spins up Postgres (`5435`), Kafka (`9094`), and Redis (`6380`) containers, waits for them to be healthy, and automatically applies `schema.sql`.*

### 2. (Optional) Seed Fake Users
If you want to manually seed users into the E2E database to test queries:
```bash
DB_PORT=5435 bun run src/tests/e2e/scripts/add-users.ts 100
```
*(This will insert 100 sequential base-26 alphabetical users: `a@a.a`, `b@a.a`, etc.)*

### 3. Run Tests Manually
Once the environment is open, you can run tests repeatedly without waiting for Docker to spin up:
```bash
bun run test:e2e:run
```

You can also run coverage or focused mutation checks against the already-open environment:

```bash
bun run test:e2e:coverage:run
bun run test:e2e:mutation:project-members:dry:run
bun run test:e2e:mutation:task-flow:dry:run
```

### 4. Close the Environment
When you're finished, wipe the containers and clear the RAM:
```bash
bun run test:e2e:close
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
