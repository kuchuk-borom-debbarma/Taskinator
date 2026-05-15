# Phase 01: Autopilot & Condition Schema - Plan

**Goal:** Define and implement the database schema for Autopilots and their logical conditions.

## Proposed Changes

### Database Layer
#### [NEW] [Autopilot.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/database/tables/Autopilot.ts)
- Define `AutopilotTable` interface using Kysely and `JSONColumnType`.
- Include `triggers` (text array), `conditions` (JSONB), and status flags.

#### [MODIFY] [index.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/database/index.ts)
- Register `autopilot` table in the `Database` interface.

### Domain Layer
#### [NEW] [ConditionTypes.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/ConditionTypes.ts)
- Define recursive `ConditionTree` type and Zod validation schema.

#### [NEW] [ConditionEvaluator.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/internal/ConditionEvaluator.ts)
- Implement `evaluateCondition(tree, context)` using the Interpreter Pattern.
- Support AND, OR, NOT and simple Equality predicates for Phase 1.

## Task List

- [ ] Create `Autopilot.ts` table definition
- [ ] Register `autopilot` in `Database` interface
- [ ] Implement `ConditionTypes.ts` with Zod schema
- [ ] Implement `ConditionEvaluator.ts` logic
- [ ] [BLOCKING] Push schema to database
  - Command: `npm run db:push` (or equivalent migration command)
- [ ] Create unit tests for `ConditionEvaluator`
- [ ] Create integration test for `Autopilot` repository (Basic CRUD)

## Verification Plan

### Automated Tests
- `npm test src/modules/autopilot/internal/ConditionEvaluator.test.ts`
- `npm test src/database/tables/Autopilot.integration.test.ts`

### Manual Verification
- Verify `autopilot` table exists in PostgreSQL using `psql`.
