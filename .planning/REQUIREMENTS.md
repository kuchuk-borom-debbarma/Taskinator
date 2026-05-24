# Requirements: v20.0 - Advanced Automation Intelligence

## 1. Multi-domain Triggers
- R-01: Support Auto Actions that trigger on events from outside their own project.
- R-02: Implement a "Global" or "Cross-Project" trigger registration mechanism.
- R-03: Update `AutoActionService` to fetch matching rules across project boundaries for multi-domain triggers.
- R-04: Ensure actor authorization supports cross-project execution (actor must have access to both trigger and target projects).

## 2. Complex Recursive Predicates
- R-05: Enhance `ConditionNode` AST to support path-based field access (e.g., `parent.status`, `subtasks.all.completed`).
- R-06: Update `ContextEngine` to recursively resolve parent and child entity contexts.
- R-07: Support aggregation predicates (e.g., `count(subtasks) > 5`, `every(subtasks.status == 'DONE')`).
- R-08: Maintain performance guards for recursive lookups to prevent DB exhaustion (max depth and cache).

## 3. Dynamic Template Expansion
- R-09: Update `ScopeTemplate` to include cross-domain trigger definitions.
- R-10: Provide metadata for parent/child relationship navigation in the builder UI.

## 4. UI-v1 Enhancements
- R-11: Update Visual Condition Builder to support path-based field selection.
- R-12: Implement an "Advanced" mode for complex predicates.
- R-13: Support "Cross-Project" trigger selection in the creation wizard.
