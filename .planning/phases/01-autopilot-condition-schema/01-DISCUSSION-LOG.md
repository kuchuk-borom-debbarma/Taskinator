# Phase 01 Discussion Log: Autopilot & Condition Schema

**Date:** 2026-05-15

## Areas Explored

### 1. Condition Tree Storage
- **Options presented**: JSONB column vs. Recursive Table.
- **User decision**: **JSONB column**.
- **Rationale**: Simplifies the read/write logic for deeply nested Boolean trees and avoids recursive SQL query complexity.

### 2. Trigger Specificity
- **Options presented**: Single event vs. Multiple events.
- **User decision**: **Multiple events per trigger**.
- **Rationale**: Provides more flexibility for Autopilots that should react to a set of related events (e.g., both creation and status updates).

### 3. Schema Extensibility
- **Agent decision**: **Property-Value Pair with Domain Prefixing**.
- **Rationale**: Future-proofs the system for Team/Project conditions without requiring table migrations for every new field.

## Deferred Ideas
- None (All items captured in CONTEXT.md).

## The Agent's Discretion
- Field naming convention: `{domain}:{fieldPath}`.
- Use of `Kysely` for type-safe schema management.
