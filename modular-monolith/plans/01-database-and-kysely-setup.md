# Plan 01: Database Schema Migration & Kysely Setup

This plan details the database schema migration and Kysely setup required for the **Server-Driven Declarative TCA Automation Engine**. 

---

## 🏗️ 1. Database Table: `task_automation_rule`

We will create the table `task_automation_rule` to store the declarative Trigger-Condition-Action automation rules for each project.

### SQL Schema Specification
We will add this table creation to a new SQL migration script. The schema is optimized for lookup and has flat parameter columns for triggers, conditions, and actions:

```sql
CREATE TABLE task_automation_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fk_project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Automation',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_sync BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = Pre-Commit Guard (Sync), FALSE = Post-Commit Cascade (Async)
    
    -- Trigger ("When Y happens")
    trigger_type TEXT NOT NULL,
    trigger_value TEXT,
    
    -- Condition ("If Z is met")
    condition_type TEXT NOT NULL,
    condition_value TEXT,
    
    -- Action ("Do X")
    action_type TEXT NOT NULL,
    action_value TEXT,
    
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Performance Index for rapid lookups inside updateTask transaction
CREATE INDEX idx_automation_project_trigger ON task_automation_rule(fk_project_id, trigger_type);
```

---

## 🛠️ 2. Kysely Table Definitions

We must register the new table in the backend monolith's database layer so Kysely type checking works flawlessly.

### Step 2.1: Create Table Interfaces File
#### [NEW] [TaskAutomationRule.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/infra/database/tables/TaskAutomationRule.ts)
We will create this new table interface file defining `TaskAutomationRuleTable` types:

```typescript
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface TaskAutomationRuleTable {
    id: Generated<string>;
    fk_project_id: string;
    name: Generated<string>;
    is_active: Generated<boolean>;
    is_sync: Generated<boolean>;
    
    trigger_type: string;
    trigger_value: string | null;
    
    condition_type: string;
    condition_value: string | null;
    
    action_type: string;
    action_value: string | null;
    
    version: Generated<number>;
    created_at: ColumnType<Date, string | undefined, never>;
    updated_at: ColumnType<Date, string | undefined, string | undefined>;
}

export type TaskAutomationRule = Selectable<TaskAutomationRuleTable>;
export type NewTaskAutomationRule = Insertable<TaskAutomationRuleTable>;
export type TaskAutomationRuleUpdate = Updateable<TaskAutomationRuleTable>;
```

### Step 2.2: Register in Database Type Map
#### [MODIFY] [index.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/infra/database/index.ts)
Add the import and append `task_automation_rule` to Kysely’s `Database` interface map:

```typescript
import type { TaskAutomationRuleTable } from './tables/TaskAutomationRule.ts';

export interface Database {
    // ... existing tables ...
    task_automation_rule: TaskAutomationRuleTable;
}
```

---

## 🏃 3. Run and Validate Migration

1. Write a SQL migration file `modular-monolith/database/migration_automation_rule.sql` containing the SQL table schema.
2. In the local development terminal, run the script against PostgreSQL:
   ```bash
   psql -h localhost -p 5435 -U admin -d test -f database/migration_automation_rule.sql
   ```
3. Run `bun run check-types` in `modular-monolith` to ensure Kysely compilation passes with zero type mismatches.
