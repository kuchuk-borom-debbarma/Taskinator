# Phase 44: Auto Action E2E Test Suite - Research

**Researched:** 2026-05-22
**Domain:** E2E Testing (GraphQL API + Event Consumer)
**Confidence:** HIGH

## Summary

The Auto Action system is split into a GraphQL API layer and a Kafka-event-driven Runtime consumer. Current testing strategy for both components relies on unit/integration tests with mocked database and event bus providers.

**Primary recommendation:** Implement a hybrid integration test suite that orchestrates the real `AutoActionService` and uses an in-memory/stubbed event bus to simulate lifecycle events, bypassing the full Kafka infra while exercising the cross-module orchestration logic.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rule Management | API / Backend | — | Mutations/Queries handled here. |
| Event Consumption | Runtime Consumer | — | Listens to Kafka tasks, triggers pipelines. |
| Pipeline Orchestration | Runtime Consumer | API / Backend | Orchestrates task moves/updates. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bun:test | Built-in | Test Framework | Project standard. |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `mock.module` | Dependency Injection | Stubbing DB/Kafka in tests. |

## Package Legitimacy Audit

No new packages required. Existing `bun:test` and `mock` infrastructure sufficient.

## Architecture Patterns

### Recommended Project Structure
```
src/modules/auto-action/
├── __tests__/
│   ├── e2e/
│   │   ├── autoActionFlow.test.ts  # Orchestration of API + Runtime logic
│   └── ...
```

### Pattern 1: Event-Driven Integration Test
**What:** Simulate event injection into the `AutoActionTaskEventConsumer`.
**When to use:** Validating that an `AutoAction` created via GraphQL mutation correctly responds to a `TASK.UPDATED` event.
**Example:**
```typescript
// Pattern: Test API mutation side-effect on Event Consumer
it('reacts to task event after rule creation', async () => {
    // 1. Create rule via GraphQL
    await resolvers.Mutation.createAutoAction(...)
    // 2. Mock DB check confirms existence
    // 3. Inject event to consumer
    await consumer.handleTaskEvents([event])
    // 4. Expect pipeline execution
})
```

## Anti-Patterns to Avoid
- **Full Integration Tests:** Do not attempt to spin up real Kafka broker/Postgres in CI. Use the `mock` module approach already established in the codebase.
- **Over-mocking service internals:** If testing the `Runtime Consumer`, mock the database and event bus, but exercise the `AutoActionServiceImpl` logic directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB state management | Custom migrations | `db.getExecutor()` | Existing project abstraction. |
| Event injection | Raw event bus access | `AutoActionTaskEventConsumer` | Ensures correct listener routing. |

## Common Pitfalls

### Pitfall 1: Event Order/Batching
**What goes wrong:** Tests fail due to batch processing logic when only one event is injected.
**How to avoid:** Ensure test event lists contain enough events to trigger batch logic if testing `batch: true` subscribers.

## State of the Art
The system successfully uses dependency injection via `mock.module` to decouple Kafka/DB dependencies in tests, keeping them fast and reliable.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Existing mocks cover DB interactions | Standard Stack | High - integration logic might rely on real DB |

## Open Questions
1. How to best verify "pipeline execution" without side-effects in tests? 
   - *Recommendation:* Mock the `executePipeline` method on the `AutoActionServiceImpl` and verify the call signature.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test |
| Full suite command | `bun test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| E2E-01 | Rule Lifecycle | Integration | `bun test src/modules/auto-action/__tests__/e2e/` |
| E2E-02 | Pipeline Trigger | Integration | `bun test src/modules/auto-action/__tests__/e2e/` |
