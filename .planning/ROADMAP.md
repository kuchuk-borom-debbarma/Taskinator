# Roadmap: v19.0 - UI-v1 Auto Action Modernization

## Phase 46: Expose Auto Action Template API
- [ ] Define `AutoActionTemplate` GraphQL types in `modular-monolith`.
- [ ] Implement `autoActionTemplate` query resolver in backend.
- [ ] Verify template query returns correct JSON schemas for actions and conditions.

## Phase 47: Terminology Rename & GQL Migration (Part 1)
- [ ] Batch rename "Autopilot" to "Auto Action" in `ui-v1` filesystem and code.
- [ ] Update `ui-v1` GraphQL fragments and queries to use `AutoAction` schema.
- [ ] Run `codegen` in `ui-v1` to generate new types.

## Phase 48: Dynamic Trigger & Condition Builder
- [ ] Update `ui-v1` to fetch `autoActionTemplate`.
- [ ] Refactor Trigger selection to use template-driven list.
- [ ] Refactor Condition builder to use template-driven `contextFields` and `conditions`.

## Phase 49: JSON Schema Action Form Generator
- [ ] Implement a dynamic form generator in `ui-v1` that reads `inputSchema` from the action template.
- [ ] Replace hardcoded action parameter forms with the dynamic generator.
- [ ] Support `isSync` toggle in the creation wizard.

## Phase 50: Integration & Optimistic UI
- [ ] Finalize `create`/`update`/`delete` mutations in `ui-v1`.
- [ ] Implement optimistic UI for status toggling with `version` tracking.
- [ ] End-to-end manual verification of the new Auto Action builder flow.
