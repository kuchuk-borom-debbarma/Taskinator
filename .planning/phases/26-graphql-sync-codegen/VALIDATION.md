# Validation: Phase 26 - GraphQL Sync & Codegen

## 📋 GQL-01: Backend Schema Alignment
- [ ] Update `autopilot.graphql` with recursive Unions and `steps` array.
- [ ] Implement resolvers in `autopilot.ts` for structured step mapping.
- [ ] Run `bun run generate-schema` to update root `schema.graphql`.

## 📋 GQL-02: UI Codegen & Refactor
- [ ] Run `npm run codegen` in `ui-v1`.
- [ ] Deprecate `GraphQLAutopilotAPI`.
- [ ] Refactor `AutopilotDashboardView` to use generated hooks.
- [ ] Implement fragment masking in child components.
- [ ] Verify end-to-end functionality.
