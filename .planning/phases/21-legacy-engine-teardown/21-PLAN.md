# Phase 21 Plan: Legacy Engine Teardown

## Tasks

- [ ] Delete `ConditionEvaluator.ts` and `.test.ts`
- [ ] Delete `ActionHandlers.ts` and `.test.ts`
- [ ] Delete `AutopilotDispatcher.ts`
- [ ] Delete `AutopilotEngine.ts` and `.test.ts`
- [ ] Delete `ActionRunner.ts` and `.test.ts`
- [ ] Delete `ContextService.ts` and `.test.ts`
- [ ] Delete `ProjectContextResolver.ts`
- [ ] Delete `TaskContextResolver.ts` and `.integration.test.ts`
- [ ] Delete `ConditionTypes.ts`
- [ ] Delete `AutopilotLoop.test.ts`, `AutopilotE2E.test.ts`, `AutopilotIntegration.test.ts`
- [ ] Delete `AuditService.ts` and `AuditLog.test.ts`
- [ ] Update `SSEController.ts` to be an empty stub that keeps connection alive but doesn't do logic.
- [ ] Update `autopilot/index.ts` to only export `AutopilotQueryService` and empty `init()`.
- [ ] Update `graphql/resolvers/autopilot.ts` to remove dependencies on deleted files and ensure API mutations continue to work (e.g., successful stub responses).

## Verification
- Code compiles without type errors.
- Tests pass.
- GraphQL server runs without crashing.
