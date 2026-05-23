# Validation: Phase 1 - Database & Schema Evolution

## Goal
Evolve the database schema to support Configurable Workspace Behaviors (CWB) and wipe legacy automation data.

## Requirements Verification

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| REQ-1.1 | Create `behavior_rule` table | [ ] | Table exists in DB |
| REQ-1.4 | Wipe `auto_action` data | [ ] | `auto_action` count is 0 |

## Truths

- [ ] The `behavior_rule` table exists with correct UUID and FK constraints.
- [ ] `TRUNCATE CASCADE` was executed on `auto_action`.
- [ ] Kysely `Database` interface includes `behavior_rule`.
- [ ] `bun x tsc --noEmit` passes with new types.

## Verification Artifacts
- `src/tests/verify-phase-1.ts` output.
- PostgreSQL `\d behavior_rule` output.

## Conclusion
[To be completed by agent after execution]
