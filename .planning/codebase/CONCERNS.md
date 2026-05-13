---
title: CONCERNS
last_mapped: 2026-05-13
---

# Technical Concerns

## HIGH — Security

### H1: Hardcoded JWT Secret Default
- **File**: `src/graphql/index.ts`
- **Code**: `const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';`
- **Risk**: If `JWT_SECRET` env var is not set, tokens can be forged by anyone who knows the default secret.
- **Fix**: Remove the fallback; throw at startup if `JWT_SECRET` is missing.

### H2: Hardcoded DB Credentials
- **File**: `src/database/index.ts`
- **Code**: `user: process.env.DB_USER || 'admin', password: process.env.DB_PASSWORD || 'password'`
- **Risk**: Default credentials are known; acceptable for local dev but dangerous if deployed without `.env`.
- **Fix**: Fail fast in production if credentials not supplied (detect via `NODE_ENV=production`).

### H3: `any` Cast in GraphQL Context for Header Access
- **File**: `src/graphql/index.ts`
- **Code**: `(initialContext as any).req?.headers?.authorization`
- **Risk**: Type-unsafe fallback path; could silently fail in some GraphQL Yoga versions.
- **Fix**: Use typed context extension or upgrade type definitions.

---

## HIGH — Reliability

### H4: OutboxRelay — No Dead-Letter Queue
- **File**: `src/utils/event-bus/OutboxRelay.ts`
- **Risk**: If Kafka publishing fails persistently for an event, `outbox_events` rows remain in `PENDING` state indefinitely with no alerting or circuit breaker.
- **Impact**: Silent data loss / event backlog growth.
- **Fix**: Add a `failed_at` column, max retry counter, and DLQ topic.

### H5: Single `processed_event` Table — Unbounded Growth
- **File**: Database schema — `processed_event` table
- **Risk**: `processed_event` rows are never purged. At scale this table grows without bound.
- **Impact**: Increasing query time for idempotency checks (`claimEventsAtomic`).
- **Fix**: TTL-based cleanup job; only need to retain events within the Kafka retention window.

### H6: Redis Pub-Sub — No Reconnection Hardening
- **File**: `src/redis/RealtimeRedisBridge.ts`
- **Risk**: `ioredis` reconnects automatically but reconnection storms (many concurrent subs) on Redis restart can overwhelm the bridge.
- **Fix**: Add exponential backoff and health check to bridge reconnect logic.

---

## MEDIUM — Tech Debt

### M1: Missing Team E2E Test Files
- **Location**: `src/tests/e2e/team/` only has `mutation.ts` and `query.ts` — no `*.test.ts` files
- **Risk**: Team create/delete/member operations have no E2E test coverage.
- **Note**: Unit tests exist (`TeamQueries.test.ts`) but E2E team tests are absent.

### M2: `any` Types in Resolver Layer
- **Files**: `src/graphql/resolvers/project.ts` — `args: any`, `_args: any`, `.map((m: any) => ...)`
- **Risk**: Type safety at the GraphQL boundary is partially lost; runtime errors possible.
- **Fix**: Use codegen-generated input types for resolver args.

### M3: `scratch-*.ts` Files in Repository Root
- **Files**: `modular-monolith/scratch-db-check.ts`, `modular-monolith/scratch-debug-tasks.ts`, `modular-monolith/test_http.ts`
- **Risk**: Accidental exposure of debug scripts; clutters the project root.
- **Fix**: Move to `src/tests/e2e/scripts/` or add to `.gitignore`.

### M4: Duplicate Test Log Files
- **Files**: `modular-monolith/member_test_output.log`, `member_test_output_2.log`, `test-output.log`, `test-output-2.log`, `test_output.log`
- **Risk**: Generated log files committed to repository.
- **Fix**: Add `*.log` to `.gitignore`.

### M5: Stale `update_task` status default
- **File**: `src/modules/task/internal/TaskQueries.ts` lines 657, 729
- **Code**: `${param.status ?? 'TODO'}` in update path
- **Risk**: Updating a task without specifying status silently resets it to `TODO`.
- **Fix**: Use `COALESCE($param.status, status)` pattern (keep existing value if not provided).

### M6: No Rate Limiting or Input Validation on GraphQL Layer
- **Risk**: GraphQL mutations accept arbitrary-length strings for `name`, `description`, etc. with no server-side length validation beyond the DB constraint check.
- **Fix**: Add input validation layer (Zod or custom) in resolvers before service calls.

---

## MEDIUM — Performance

### M7: `max: 10` DB Pool — Potentially Undersized for 10k RPS Target
- **File**: `src/database/index.ts`
- **Code**: `max: 10` in Pool config
- **Risk**: At high concurrency, pool exhaustion causes queuing/timeouts. Pool size should be tuned to `(CPU cores * 2) + effective disk spindles` or benchmarked.
- **Fix**: Increase pool size and tune `idleTimeoutMillis` based on load testing results.

### M8: `LISTEN/NOTIFY` Polling in OutboxRelay
- **File**: `src/utils/event-bus/OutboxRelay.ts`
- **Note**: OutboxRelay uses PostgreSQL `LISTEN/NOTIFY` mechanism (line: `let listenClient`) which is efficient, but the fallback polling interval should be confirmed to not create hot-loops.

---

## LOW — Code Quality

### L1: No OpenAPI/REST Fallback
- The system is 100% GraphQL — no REST endpoints. This is fine by design but means no Swagger/OpenAPI docs for external integrations.

### L2: Frontend Has No Tests
- `ui-v1/` has no test files, no test framework configured.
- **Risk**: UI regressions go undetected.
- **Fix**: Add Vitest + React Testing Library for component tests; Playwright for E2E UI.

### L3: `graphify-out/` Directory Committed
- **Location**: `modular-monolith/graphify-out/`
- Generated graph analysis output (`graph.json`, `graph.html`, etc.) is committed.
- Should be in `.gitignore` unless intentional documentation artifact.

### L4: `remotion/` and `thesis/` Are Unrelated to Core Product
- These sub-projects share the same Git repository, adding noise to the primary codebase.
- Consider extracting to separate repos or at minimum documenting their purpose clearly.

### L5: No `.env.example` File
- The project has hardcoded defaults but no `.env.example` documenting required environment variables.
- **Fix**: Add `.env.example` with all required vars documented.

---

## Summary

| Priority | Count | Key Concern |
|---|---|---|
| HIGH Security | 3 | Hardcoded JWT secret, DB credentials |
| HIGH Reliability | 3 | No DLQ, unbounded processed_event, Redis reconnect |
| MEDIUM Tech Debt | 6 | Missing team E2E tests, `any` types, debug files |
| MEDIUM Performance | 2 | DB pool size, outbox relay polling |
| LOW Quality | 5 | No UI tests, generated files committed |
