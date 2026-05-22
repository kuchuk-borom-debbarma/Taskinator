# Requirements: v19.0 - UI-v1 Auto Action Modernization

## 1. Terminology Replacement
- R-01: Replace all occurrences of "Autopilot" with "Auto Action" in `ui-v1` source code (components, variables, comments).
- R-02: Update UI labels, headers, and tooltips to use "Auto Action".

## 2. Backend GraphQL API Updates
- R-03: Expose `ScopeTemplate` query in `modular-monolith` GraphQL API.
- R-04: Implement `autoActionTemplate(scope: String!, isSync: Boolean): AutoActionTemplate!` query.
- R-05: Ensure `AutoAction` type in GraphQL matches the backend database schema (JSON triggers/steps, isSync, description).

## 3. UI GraphQL Integration
- R-06: Replace `autopilots` query with `autoActions` connection query.
- R-07: Replace `createAutopilot`, `updateAutopilot`, `deleteAutopilot` mutations with `createAutoAction`, `updateAutoAction`, `deleteAutoAction`.
- R-08: Support `JSON` scalar for `steps` and `triggers` in the UI client.

## 4. Dynamic Template-Driven UI
- R-09: Fetch available triggers and actions from `autoActionTemplate` query.
- R-10: Dynamically render condition predicates based on `contextFields` and `conditions` from the template.
- R-11: Generate action configuration forms dynamically from the `inputSchema` (JSON Schema) provided in the template.

## 5. Feature Support
- R-12: Add support for toggling `isSync` (Synchronous vs. Asynchronous) in the Auto Action creation/edit flow.
- R-13: Add `description` field to the Auto Action UI.
- R-14: Implement optimistic updates for `isActive` toggling using the new `version` field for OCC.
