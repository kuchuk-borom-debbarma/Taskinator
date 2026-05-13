---
title: CONVENTIONS
last_mapped: 2026-05-13
---

# Code Conventions

## Language & Tooling

- **TypeScript strict mode** — `strict: true`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- **Module system** — ESM (`"type": "module"`, `verbatimModuleSyntax: true`)
- **Formatter/Linter** — Biome (`@biomejs/biome ^2.4.9`) — replaces ESLint + Prettier
  - Run: `bun run format` or `bun run clean-format`
- **No barrel files** at domain boundaries — explicit named imports with `.ts` extensions

## Module Structure Pattern

Every domain module follows the same layout:

```
modules/<domain>/
├── <Domain>Service.ts      # Public interface (types exported from here)
├── index.ts                # Singleton: export const domainService = new DomainServiceImpl()
└── internal/
    ├── <Domain>ServiceImpl.ts  # Class implementing the interface
    ├── <Domain>Queries.ts      # All DB queries (Kysely or raw sql`...`)
    └── listeners/
        └── <Source>_<Effect>.ts
```

**Rule**: External code never imports from `internal/`. Only the service interface and `index.ts` are public.

## Database Query Patterns

### Simple queries — Kysely builder
```typescript
// src/modules/project/internal/ProjectQueries.ts
return await trx
    .selectFrom('outbox_events')
    .selectAll()
    .where('status', '=', 'PENDING')
    .orderBy('created_at', 'asc')
    .limit(100)
    .forUpdate()
    .skipLocked()
    .execute();
```

### Complex mutations — raw sql<T> tagged template with CTE
```typescript
// Transactional outbox pattern: atomic write + event emission
const result = await sql<Project>`
    WITH inserted_project AS (
        INSERT INTO project (name, description, fk_user_id)
        VALUES (${param.name}, ${param.description ?? null}, ${param.userId})
        RETURNING id, name, ...
    ),
    inserted_outbox AS (
        INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
        SELECT ${KAFKA_TOPICS.PROJECT}, id::text, jsonb_build_object(...)
        FROM inserted_project
    )
    SELECT * FROM inserted_project
`.execute(db);
return result.rows[0] || null;
```

### Optimistic Locking
```typescript
// Always pass version in updates
UPDATE project
SET name = ..., version = version + 1
WHERE id = ${param.id} AND version = ${param.version}
```

### Cursor-based Pagination
- Cursor encodes `(createdAt ISO string, id UUID)` via `encodeCursor()` / `decodeCursor()` from `src/utils/utils.ts`
- All list queries include ID tie-breaker for deterministic pagination
- Returns `{ edges, pageInfo: { hasNextPage, hasPreviousPage, startCursor, endCursor } }`

## Event Bus Patterns

### Publishing (in Query files via Outbox CTE)
```typescript
// Never publish directly — always go through outbox_events table
INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
SELECT ${KAFKA_TOPICS.PROJECT}, id::text,
    jsonb_build_object('type', ${KAFKA_EVENTS.PROJECT.CREATED}::text, ...)
```

### Subscribing (in Listener files)
```typescript
await eventBus.subscribe(
    KAFKA_TOPICS.PROJECT_AGGREGATED,
    'consumer-group-name',
    {
        [KAFKA_EVENTS.PROJECT_AGGREGATED.CHANGE_PROJECT_MEMBER_COUNT]:
            this.handleEvent.bind(this),
    },
    { batch: true },
);
```

### Idempotency (in every listener handler)
```typescript
await db.transaction().execute(async (trx) => {
    const unprocessed = await claimEventsAtomic(trx, events, 'consumer-group-name');
    if (unprocessed.length === 0) return; // Already processed
    // ... handle unprocessed events
});
```

## Listener Naming Convention

Format: `<SourceTopic>_<Effect>`

```
ProjectAggregated_ChangeProjectMemberCount.ts   // Updates members_count
ProjectAggregated_DeleteProjectTask.ts          // Cascades project deletion to tasks
TaskAggregated_SyncTeamTaskCountListener.ts     // Syncs team task counter
TeamAggregated_PurgeTeamMembershipsListener.ts  // Cascades team deletion
```

## GraphQL Resolver Patterns

```typescript
// Pattern: authorize → delegate to service → transform for GraphQL
async createProject(_: any, args: any, context: GraphQLContext) {
    if (!context.userId) throw new UnauthorizedError();
    const project = await projectService.createProject({ ... });
    if (!project) throw new MutationFailedError();
    return project;
}
```

- Auth check always first: `if (!context.userId) throw new UnauthorizedError()`
- Return null → throw `MutationFailedError` or `NotFoundError`
- Dates always serialized as ISO strings: `parent.createdAt.toISOString()`
- Count fields default to 0: `parent.membersCount || 0`

## Error Handling

### Backend (GraphQL)
- `UnauthorizedError` — missing/invalid JWT
- `NotFoundError` — entity not found
- `MutationFailedError` — DB operation returned null
- All extend `GraphQLError` from `src/graphql/errors.ts`

### Service Layer
- Returns `T | null` for nullable operations
- Throws on infrastructure failures (DB down, etc.)
- Logging via Winston at each layer: `logger.debug(...)` for service calls, `logger.error(...)` for failures

## Frontend Conventions

### Component Organization
- Feature components in `src/components/<Domain>/`
- Shared components in `src/components/shared/`
- No CSS modules — Tailwind classes directly in JSX

### API Access Pattern
```typescript
// Always access API via context hook
const { projectApi } = useApi();
const { data } = useQuery({ queryKey: ['projects'], queryFn: () => projectApi.getProjects() });
```

### GraphQL Queries
- All queries defined inline in adapter files (`GraphQLProjectAPI.ts`)
- Types generated by codegen — never hand-written for API responses

### Auth State
- JWT stored in cookies (`src/utils/cookies.ts`)
- `AuthContext.tsx` provides `userId`, `token`, `login()`, `logout()`

## Logger Usage

```typescript
import { logger } from '../../../logger';
logger.info('[ServiceName] Action description');
logger.debug(`[ServiceName] Detail: ${value}`);
logger.error('[ServiceName] Error description', err);
```

- Bracket prefix with service name: `[ProjectService]`, `[OutboxRelay]`, `[Registry]`
- Debug level for per-call tracing
- Info level for lifecycle events (init, ready, shutdown)
- Error level for failures

## TypeScript Patterns

### Database Table Types
```typescript
// src/database/tables/Project.ts
export interface ProjectTable {
    id: Generated<string>;
    name: string;
    description: string | null;
    fk_user_id: string;
    version: Generated<number>;
    created_at: Generated<Date>;
    ...
}
```

### Service Interfaces
```typescript
// Clean interface first, impl separately
export interface ProjectService {
    getProjectsOfUser(userId: string, params?: PaginationParams): Promise<...>;
    createProject(param: { userId: string; name: string; description?: string }): Promise<Project | null>;
}
```

### Environment Guards
```typescript
// Feature flags via env
const eventBus: Bus = process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_BUS === 'true'
    ? new MemoryBus()
    : new KafkaBus();
```
