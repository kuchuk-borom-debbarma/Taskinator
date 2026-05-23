# Phase 1: Database & Schema Evolution - Research

**Researched:** 2025-05-22
**Domain:** Database Schema / Kysely Types / Migrations
**Confidence:** HIGH

## Summary

This research identifies the required database changes to replace the legacy `auto_action` system with the new `behavior_rule` engine. The project follows a "Fresh Start" migration strategy for this phase, meaning existing automation data will be wiped. We will implement a new table `behavior_rule` with a flat targeting structure to simplify rule evaluation and relationship traversal.

**Primary recommendation:** Use `TRUNCATE TABLE auto_action CASCADE;` to wipe legacy data while keeping the table structure to maintain compatibility with existing code until the cleanup phase (Phase 4), and implement `behavior_rule` with optimized indexes for project and task-specific lookups.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema Evolution | Database | — | Creation of `behavior_rule` table and indexes. |
| Type Safety | API / Backend | — | Kysely type definitions for the new table. |
| Legacy Wipe | Database | — | Clearing existing `auto_action` records. |
| Data Integrity | Database | API / Backend | Foreign key constraints and transaction-safe migrations. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Kysely | 0.28.14 | Type-safe SQL builder | Project standard for DB access. |
| PostgreSQL | 16 (Docker) | Primary Datastore | Relational storage with JSONB and UUID support. |
| pg | 8.20.0 | Postgres driver | Underlying driver for Kysely. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| uuid-ossp | Extension | UUID generation | Enabled in `schema.sql`. |

**Installation:**
No new packages required. Existing dependencies are sufficient.

**Version verification:**
```bash
# Node.js / Bun
npm list kysely pg
# Verified: kysely@0.28.14, pg@8.20.0
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| kysely | npm | 3 yrs | 1.2M/wk | github.com/kysely-org/kysely | [OK] | Approved |
| pg | npm | 14 yrs | 20M/wk | github.com/brianc/node-postgres | [OK] | Approved |
| kafkajs | npm | 7 yrs | 1M/wk | github.com/tulios/kafkajs | [OK] | Approved |
| ioredis | npm | 9 yrs | 6M/wk | github.com/redis/ioredis | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### Recommended Project Structure
```
src/
└── database/
    ├── index.ts              # Database interface update
    ├── tables/
    │   └── BehaviorRule.ts   # New Kysely table definition
    └── migrations/           # (Optional) Scripted migrations
```

### Pattern: Flat Targeting Rule
**What:** Avoid nested JSON logic. Use flat columns for criteria.
**When to use:** All `behavior_rule` definitions.
**Example:**
```typescript
// src/database/tables/BehaviorRule.ts
export interface BehaviorRuleTable {
    behavior_type: 'BLOCKER_RESOLUTION' | 'PARENT_DELETE_GUARD' | ...;
    criteria_field: string | null;
    criteria_operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | null;
    criteria_value: string | null;
}
```

### Anti-Patterns to Avoid
- **JSON AST Logic:** Do not use `triggers: JSONB` or `steps: JSONB` as in the old `auto_action` schema.
- **Recursive App-Side Traversal:** Delegate DAG relationship checks to Kysely queries (e.g., using `task_reachability`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID Generation | Custom JS UUID | `uuid_generate_v4()` | DB-native, faster, guaranteed unique in index. |
| Type-Safe SQL | Raw string templates | Kysely | Prevents SQL injection and catch schema mismatches at compile time. |

## Common Pitfalls

### Pitfall 1: Breaking Legacy Code
**What goes wrong:** `DROP TABLE auto_action;` immediately causes compilation errors and runtime crashes in modules not yet refactored.
**How to avoid:** Use `TRUNCATE TABLE auto_action;` in Phase 1 to wipe data but preserve the schema until Phase 4 (Cleanup).

### Pitfall 2: FK Constraint Violations
**What goes wrong:** Attempting to delete tasks or projects that are referenced by the new `behavior_rule` table without `ON DELETE CASCADE`.
**How to avoid:** Ensure `behavior_rule` fields for `fk_project_id` and `fk_task_id` use `ON DELETE CASCADE`.

## Code Examples

### SQL Schema for `behavior_rule`
```sql
-- Source: docs/RC-ENGINE-PROMPT.md (Refined)
CREATE TABLE behavior_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    behavior_type TEXT NOT NULL, -- e.g. 'BLOCKER_RESOLUTION', 'PARENT_DELETE_GUARD'
    
    fk_task_id UUID REFERENCES project_task(id) ON DELETE CASCADE,
    
    criteria_field TEXT,
    criteria_operator TEXT, -- 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN'
    criteria_value TEXT,
    
    action_message TEXT,
    action_value TEXT,
    
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_behavior_rule_project ON behavior_rule(fk_project_id);
CREATE INDEX idx_behavior_rule_task ON behavior_rule(fk_task_id) WHERE fk_task_id IS NOT NULL;
```

### Kysely Type Definition
```typescript
// src/database/tables/BehaviorRule.ts
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export type BehaviorType = 
    | 'BLOCKER_RESOLUTION' 
    | 'PARENT_DELETE_GUARD' 
    | 'PRIORITY_CASCADE' 
    | 'TEAM_CASCADE' 
    | 'BLOCKER_SAFETY_GUARD' 
    | 'MEMBER_ASSIGNMENT_GUARD' 
    | 'CASCADE_DELETE' 
    | 'AUTO_NOTIFY';

export type CriteriaOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN';

export interface BehaviorRuleTable {
    id: Generated<string>;
    fk_project_id: string;
    name: string;
    is_active: Generated<boolean>;
    behavior_type: BehaviorType;
    fk_task_id: string | null;
    criteria_field: string | null;
    criteria_operator: CriteriaOperator | null;
    criteria_value: string | null;
    action_message: string | null;
    action_value: string | null;
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type BehaviorRule = Selectable<BehaviorRuleTable>;
export type NewBehaviorRule = Insertable<BehaviorRuleTable>;
export type BehaviorRuleUpdate = Updateable<BehaviorRuleTable>;
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Existing migration workflow is primarily custom scripts (`runMigration.ts`) | Summary | Minor — would need to adapt to a framework if one is hidden. |
| A2 | "Fresh Start" implies clearing data only in Phase 1 | Wipe Strategy | Low — keeping table structure prevents build breakage. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Data layer | ✓ | 16.0 | — |
| Bun | Runtime | ✓ | 1.3.5 | node |
| Kysely | DB Access | ✓ | 0.28.14 | — |
| Docker | DB Hosting | ✓ | 24.x | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest + ts-jest |
| Config file | `jest.config.js` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-1.1 | Create `behavior_rule` table | Integration | `bun run src/tests/e2e/scripts/apply-schema.ts` | ✅ |
| REQ-1.4 | Wipe `auto_action` data | Integration | `psql -c "SELECT count(*) FROM auto_action"` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] Add `behavior_rule` to `database/schema.sql`.
- [ ] Create `src/database/tables/BehaviorRule.ts`.
- [ ] Update `src/database/index.ts` with `behavior_rule`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Use Kysely for all queries; validate rule inputs. |
| V4 Access Control | yes | Ensure `fk_project_id` is verified during rule CRUD. |

### Known Threat Patterns for SQL

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection | Tampering | Kysely parameterized queries. |
| Unauthorized Access | Information Disclosure | Filter by `fk_project_id` and `fk_user_id` (via joins). |

## Sources

### Primary (HIGH confidence)
- `docs/RC-ENGINE-PROMPT.md` - Schema and behavior types.
- `.planning/PROJECT.md` - Objectives and Decisions.
- `database/schema.sql` - Existing DB structure.
- `package.json` - Stack and dependencies.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly from package.json and docker config.
- Architecture: HIGH - Defined in RC-ENGINE-PROMPT.md.
- Pitfalls: MEDIUM - Based on common refactoring experience.

**Research date:** 2025-05-22
**Valid until:** 2025-06-21
