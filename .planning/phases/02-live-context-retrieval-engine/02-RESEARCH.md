# Phase 02: Live-Context Retrieval Engine - Research

**Date:** 2026-05-15
**Phase Goal:** Build the mechanism to fetch "fresh" domain state from the DB for condition evaluation.

## Technical Findings

### 1. Decentralized Domain Resolvers
To keep the engine modular, we will define a `DomainContextResolver` interface. Each module (Task, Project, etc.) will implement this interface.

**Interface:**
```typescript
interface DomainContextResolver {
  resolve(ids: string[]): Promise<Record<string, any>[]>;
}
```

### 2. Service Interface Integration
The resolvers will wrap the existing service calls:
- **Task**: Uses `TaskService.getTasksByIds(ids)`.
- **Project**: Uses `ProjectService.getProjectsByIds(ids)`.
- **Member**: Uses `ProjectService.getProjectMembersByIds(ids)`.

### 3. Context Flattening & Merging
The `ContextService` will perform the following steps:
1. **Fetch**: Call the appropriate resolver for the target entity.
2. **Flatten**: Convert the database object (e.g. `{ status: 'DONE', priority: 10 }`) into flat keys (e.g. `{ 'task:status': 'DONE', 'task:priority': 10 }`).
3. **Merge**: Inject the incoming event payload. If an event says `field: 'status', old: 'TODO', new: 'DONE'`, the context will also include `'task:status:changed': true`.

### 4. Dependency Injection
In our modular monolith, we use a central `index.ts` in each module to export the service instance. The `Autopilot` module will need access to these instances.

## Proposed Architecture

### `ContextService`
A central service that manages the registry of resolvers.

| Method | Description |
|--------|-------------|
| `registerResolver(domain, resolver)` | Link a domain string to a resolver. |
| `buildContext(domain, id, eventPayload)` | End-to-end context construction. |

### Domain Resolvers
Implemented within the respective module's `internal` folder but registered during system bootstrap.

## Implementation Strategy
1. Define `DomainContextResolver` interface.
2. Create `ContextService.ts` in `src/modules/autopilot/internal/`.
3. Implement `TaskContextResolver` using `TaskService`.
4. Implement `ProjectContextResolver` using `ProjectService`.
5. Update the `Autopilot` module bootstrap to register these resolvers.

## Verification Plan
- **Unit Tests**: Verify `ContextService` correctly flattens and merges data.
- **Integration Tests**: Verify that `TaskContextResolver` successfully fetches a real task from the database.
