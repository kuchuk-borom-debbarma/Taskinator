# Phase 22 Research: Database Schema & Engine Primitives

## Technical Findings

1. **Tech Stack Conflict & Resolution:**
   - The `22-CONTEXT.md` explicitly mentions "Schema will be written using Kotlin / Exposed ORM within the Taskinator Workspace."
   - However, exploring the `Taskinator-v2` workspace reveals that the backend codebase is actually a **Node.js/Bun** monolith using **Kysely** for types and raw `.sql` files for schema creation.
   - *Conclusion for Planning:* We will proceed with creating the schema inside `modular-monolith/database/schema.sql` and Kysely types in `modular-monolith/src/database/tables/`, ignoring the Kotlin reference.

2. **Database Engine & ORM Details:**
   - **SQL File:** `modular-monolith/database/schema.sql` is where new tables must be defined using standard PostgreSQL.
   - **Kysely Types:** Types need to be added to `modular-monolith/src/database/tables/` and exported to `Database` interface in `modular-monolith/src/database/index.ts`.

3. **Schema Mapping based on Requirements & Context:**
   - `conditions`: Primary key `id` will be the structural hash (e.g., `VARCHAR(64)` or `TEXT`). Columns: `id` (hash PK), `name` (TEXT), `definition` (JSONB), `created_at`, `created_by`.
   - `condition_labels`: Allows custom names for conditions per project. Columns: `id` (UUID PK), `name` (TEXT), `condition_hash` (FK to `conditions.id`), `project_id` (UUID FK). Must have a `UNIQUE(project_id, name)` constraint.
   - `actions`: Primary key `id` will be the structural hash. Columns: `id` (hash PK), `name` (TEXT), `steps` (JSONB), `created_at`, `created_by`.
   - `autopilot`: Currently exists but needs schema modifications to support the new engine. We must drop `triggers` and `conditions` (or create a new V2 table), and add `name`, `description`, `created_by`, and most importantly `steps` JSONB array (replacing the need for `autopilot_steps` table per `22-CONTEXT.md`).
   - `autopilot_action`: There is an existing migration script `createAutopilotActions.ts` and `AutopilotAction.ts` table definition from the legacy engine. This should be dropped/deleted to maintain a clean slate for the V6.0 Autopilot engine.

4. **Schema Push Detection:**
   - The phase modifies `database/schema.sql` and `src/database/tables/*.ts`. We need a `[BLOCKING]` task to ensure these changes are properly reflected, likely via a manual database migration or reset script using `psql` or the project's seeding strategy.

## What I need to know to PLAN this phase well:

- I need to plan the addition of `conditions`, `condition_labels`, and `actions` tables to `schema.sql`.
- I need to plan the modification of the `autopilot` table in `schema.sql` to add `name`, `description`, `steps` (JSONB), and `created_by` (or `fk_user_id`).
- I need to plan the removal of legacy `autopilot_action` tables and scripts.
- I need to plan the corresponding TypeScript Kysely interface definitions in `src/database/tables/` and wire them into `src/database/index.ts`.

## RESEARCH COMPLETE
