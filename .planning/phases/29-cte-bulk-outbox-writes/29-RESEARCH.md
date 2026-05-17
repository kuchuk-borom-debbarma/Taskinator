# Phase 29: CTE Bulk Outbox Writes - Research

## 1. Context & Objectives

The goal of this phase is to upgrade the autopilot state write path to write outbox notification events (`task.updated`, `team.updated`, etc.) to the `outbox_events` table transactionally under a single PostgreSQL Common Table Expression (CTE) query. This propagates automated state updates to downstream Kafka topics in exactly **one database round-trip**, satisfying our 10k RPS target.

## 2. Technical Architecture & Kysely CTE Compilation

### 2.1. The Single-Query CTE Pattern

For any entity type `T`, the compiled query structure should execute:
```sql
WITH old_state AS (
    SELECT id, [config.selectFields] 
    FROM [tableName] 
    WHERE id IN ([ids])
),
updated_entity AS (
    UPDATE [tableName]
    SET [CASE clauses]
    WHERE id IN ([ids])
    RETURNING id, [config.selectFields]
),
inserted_outbox AS (
    INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
    SELECT 
        [config.topic],
        u.[config.keyField]::text,
        jsonb_build_object(
            'type', [config.eventType],
            [config.idField], u.id,
            [if task/team] 'projectId', u.fk_project_id,
            'old', jsonb_build_object([old state pairs]),
            'new', jsonb_build_object([new state pairs]),
            'actorId', 'system:autopilot',
            'traceId', [traceIdCase],
            'depth', [depthCase]
        )
    FROM updated_entity u
    JOIN old_state o ON u.id = o.id
)
SELECT 1
```

### 2.2. Dynamic Entity Metadata Registry

We define a table-agnostic metadata registry map inside [SmartAggregator.ts](file:///Users/kuchukboromdebbarma/Documents/projects/Taskinator-v2/modular-monolith/src/modules/autopilot/orchestrator/SmartAggregator.ts):
```typescript
interface EntityConfig {
    topic: string;
    eventType: string;
    selectFields: string[];
    keyField: string;
    idField: string;
    payloadFields: Record<string, string>; // Maps outbox JSON keys to DB column names
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
    project_task: {
        topic: 'task-events',
        eventType: 'task.updated',
        selectFields: ['id', 'fk_project_id', 'fk_team_id', 'fk_member_id', 'title', 'status'],
        keyField: 'fk_project_id',
        idField: 'taskId',
        payloadFields: {
            teamId: 'fk_team_id',
            memberId: 'fk_member_id',
            title: 'title',
            status: 'status'
        }
    },
    project_team: {
        topic: 'team-events',
        eventType: 'team.updated',
        selectFields: ['id', 'fk_project_id', 'name'],
        keyField: 'fk_project_id',
        idField: 'teamId',
        payloadFields: {
            name: 'name'
        }
    },
    project: {
        topic: 'project-events',
        eventType: 'project.updated',
        selectFields: ['id', 'name', 'description'],
        keyField: 'id',
        idField: 'projectId',
        payloadFields: {
            name: 'name',
            description: 'description'
        }
    }
};
```

### 2.3. Programmatic jsonb_build_object construction

We compile the old/new state payload query structures programmatically using Kysely's `sql` template helper:
```typescript
const oldPairs: any[] = [];
const newPairs: any[] = [];
for (const [jsonKey, dbCol] of Object.entries(config.payloadFields)) {
    oldPairs.push(sql`${jsonKey}`);
    oldPairs.push(sql`o.${sql.ref(dbCol)}`);
    newPairs.push(sql`${jsonKey}`);
    newPairs.push(sql`u.${sql.ref(dbCol)}`);
}
const oldBuild = sql`jsonb_build_object(${sql.join(oldPairs, sql`, `)})`;
const newBuild = sql`jsonb_build_object(${sql.join(newPairs, sql`, `)})`;
```

---

## 3. Strict Fail-Safe Validation

To enforce traceability, we inject validation gates at the top of the `push()` method:
```typescript
if (!traceId) {
    logger.error(`[SmartAggregator] Pushing to buffer failed: Missing traceId for ${entityType}:${entityId}`);
    throw new Error(`Missing traceId for entity mutation (${entityType}:${entityId})`);
}
if (depth === undefined || depth === null || typeof depth !== 'number') {
    logger.error(`[SmartAggregator] Pushing to buffer failed: Missing or invalid depth for ${entityType}:${entityId}`);
    throw new Error(`Missing or invalid depth header for entity mutation (${entityType}:${entityId})`);
}
```

---

## 4. Recovery Buffer Merging Precedence

When updating the failed items recovery buffer logic in the `flush` exception catch, we preserve loop-depth consistency by keeping the oldest/original trace data:
```typescript
const existing = currentBuffer.get(item.entityId)!;
currentBuffer.set(item.entityId, {
    ...item,
    changes: { ...item.changes, ...existing.changes },
    traceId: item.traceId, // D-03: Keep original/oldest trace ID
    depth: item.depth,     // D-03: Keep original/oldest depth
});
```

---

## 5. Verification Architecture

- **Unit Tests**: Add comprehensive test suites to `SmartAggregator.test.ts` to assert:
  1. Exception is thrown when traceId or depth is missing in `push()`.
  2. Merged recovery buffer preserves the oldest traceId/depth.
  3. executeBulkUpdate executes table-agnostic CTE queries containing Kysely CTE definitions for `project_task`, `project_team`, and `project`.
- **Integration Tests**: Execute active orchestrator tests (`bun test`) to confirm zero regressions on existing pipeline flows.
