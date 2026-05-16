---
wave: 1
depends_on: []
files_modified:
  - modular-monolith/database/schema.sql
  - modular-monolith/src/database/tables/Autopilot.ts
  - modular-monolith/src/database/tables/AutopilotCondition.ts
  - modular-monolith/src/database/tables/AutopilotConditionLabel.ts
  - modular-monolith/src/database/tables/AutopilotActionDef.ts
  - modular-monolith/src/database/tables/AutopilotActionLabel.ts
  - modular-monolith/src/database/index.ts
autonomous: true
requirements_addressed: [DB-01, DB-02, DB-03, DB-04, DB-05]
---

# Phase 22 Plan: Database Schema & Engine Primitives

<objective>
Provision the database tables for the new three-layer Autopilot architecture, updating the schema.sql and creating Kysely definitions, while removing the legacy action table. Includes action_labels and comprehensive audit timestamp/user fields.
</objective>

<tasks>

<task>
<description>Update the existing `autopilot` table in schema.sql to the new v6 format.</description>
<read_first>
- modular-monolith/database/schema.sql
</read_first>
<action>
In `modular-monolith/database/schema.sql`:
1. Drop the `idx_autopilot_triggers` index.
2. Alter the `autopilot` table definition:
   - Drop columns `triggers` and `conditions`.
   - Add column `name TEXT NOT NULL DEFAULT 'Untitled Autopilot'`.
   - Add column `description TEXT`.
   - Add column `created_by TEXT`. 
   - Add column `updated_by TEXT`.
   - Add column `steps JSONB NOT NULL DEFAULT '[]'`.
</action>
<acceptance_criteria>
- `schema.sql` `autopilot` table has `name`, `description`, `created_by`, `updated_by`, and `steps` JSONB columns.
- `schema.sql` `autopilot` table no longer has `triggers` or `conditions`.
</acceptance_criteria>
</task>

<task>
<description>Create the `conditions`, `condition_labels`, `actions`, and `action_labels` tables in schema.sql.</description>
<read_first>
- modular-monolith/database/schema.sql
</read_first>
<action>
In `modular-monolith/database/schema.sql`, add the following new tables:

```sql
-- Autopilot Conditions Table
CREATE TABLE conditions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL
);

-- Autopilot Condition Labels Table
CREATE TABLE condition_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    condition_hash TEXT NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    UNIQUE(project_id, name)
);

-- Autopilot Actions Table
CREATE TABLE actions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    steps JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL
);

-- Autopilot Action Labels Table
CREATE TABLE action_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    action_hash TEXT NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    UNIQUE(project_id, name)
);
```
</action>
<acceptance_criteria>
- `schema.sql` contains `conditions`, `condition_labels`, `actions`, and `action_labels` tables.
- `condition_labels` and `action_labels` have the `UNIQUE(project_id, name)` constraint.
</acceptance_criteria>
</task>

<task>
<description>Update Kysely table definitions and `Database` interface.</description>
<read_first>
- modular-monolith/src/database/tables/Autopilot.ts
- modular-monolith/src/database/index.ts
</read_first>
<action>
1. Delete `modular-monolith/src/database/tables/AutopilotAction.ts` and `modular-monolith/src/database/createAutopilotActions.ts`.
2. Edit `modular-monolith/src/database/tables/Autopilot.ts`:
   - Update `AutopilotTable` interface: add `name`, `description`, `created_by`, `updated_by`, `steps`; remove `triggers`, `conditions`.
3. Create `modular-monolith/src/database/tables/AutopilotCondition.ts` (`ConditionTable`).
4. Create `modular-monolith/src/database/tables/AutopilotConditionLabel.ts` (`ConditionLabelTable`).
5. Create `modular-monolith/src/database/tables/AutopilotActionDef.ts` (`ActionDefTable`).
6. Create `modular-monolith/src/database/tables/AutopilotActionLabel.ts` (`ActionLabelTable`).
7. Update `modular-monolith/src/database/index.ts`:
   - Add `conditions: ConditionTable`, `condition_labels: ConditionLabelTable`, `actions: ActionDefTable`, `action_labels: ActionLabelTable`.
   - Remove `autopilot_action`.
</action>
<acceptance_criteria>
- `bun run check-types` passes.
- `Database` interface includes all new tables.
- Legacy `autopilot_action` types are removed.
</acceptance_criteria>
</task>

</tasks>

<verification>
- Verify types: `bun run check-types` in `modular-monolith` should pass.
</verification>

<must_haves>
<truths>
- Schema must support storing sequences directly on the `autopilot` table in a `steps` JSONB array.
- `conditions` and `actions` tables must use the structural hash as the `id` Primary Key.
- Label tables must enforce unique names per project and contain created/updated_by tracking fields.
</truths>
</must_haves>
