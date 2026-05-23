# Phase 5: Verification & Hardening - Research

**Researched:** 2026-05-24
**Domain:** Testing, Profiling, Data Integrity
**Confidence:** HIGH

## Summary
The system has implemented 3 Pre-Action Guards (Preventive) and 4 Post-Action Cascades (Reactive). Research identified a critical mismatch in link labels between Guards and Cascades. Existing test infrastructure is robust but lacks E2E coverage for multi-level transitive cascades and circularity handling.

## Architectural Responsibility Map
| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Guards | API (TaskService) | Database | Synchronous validation before commit |
| Cascades | Kafka Consumer | API (CascadeService) | Asynchronous, eventually consistent updates |
| Profiling | Database/Load Test | — | Monitoring query performance of reachability |

## Standard Stack
| Library | Version | Purpose |
|---------|---------|---------|
| Jest | ^30.3.0 | Test runner |
| Supertest | ^7.2.2 | E2E GraphQL testing |
| Kysely | ^0.28.17 | Query builder for performance profiling |

## Architecture Patterns
- **Guard Pipeline**: Injected into `TaskService` mutations. Evaluates `behavior_rule` records before DB execution.
- **Transitive Cascades**: Uses the `task_reachability` closure table to perform set-based updates on descendants in a single query.

## Proposed E2E Test Cases
1. **Transitive Priority**: Update Task A priority -> Verify Task C (grandchild) updates via Kafka.
2. **Blocker Chain**: Resolve Task A -> Verify Task B (blocked by A) becomes READY -> Resolve Task B -> Verify Task C (blocked by B) becomes READY.
3. **Circular Reachability**: Create A->B, B->A (if allowed) -> Verify cascades don't infinite loop.
4. **Guard Multi-Violation**: Trigger subtask and blocker guard simultaneously -> Verify first one blocks with specific message.

## Common Pitfalls
- **Label Mismatch**: `GuardService` uses `'blocks'` vs `CascadeService` uses `'BLOCKER'`.
- **Race Conditions**: Two concurrent cascades updating the same subtask tree.
- **Kafka Lag**: E2E tests must use `waitFor` to account for eventual consistency.

## Performance Bottlenecks
- `task_reachability` repair CTE is O(N^2) in worst-case graph changes.
- `CascadeService.resolveBlockers` contains a `NOT EXISTS` subquery that may scan many links.

## Assumptions Log
| # | Claim | Section | Risk |
|---|-------|---------|------|
| A1 | Label mismatch is a bug | Pitfalls | Implementation might rely on distinct labels for different behaviors |
