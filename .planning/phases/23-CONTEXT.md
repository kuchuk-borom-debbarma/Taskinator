# Context: Phase 23 - Condition Engine

## 🎯 Goal
Implement the entity-agnostic condition evaluation logic, including structural hashing and composability.

## 🛠️ Decisions

### 1. Condition AST Structure (Field-Op-Value)
- Conditions will be represented as JSON objects with `field`, `operator`, and `value` (or `values` for multi-value operators).
- Example: `{ "field": "status", "operator": "eq", "value": "DONE" }`
- Boolean composition will use `logic` and `terms`: `{ "logic": "AND", "terms": [...] }`

### 2. Change Triggers & State Management
- **Contextual Diff**: The evaluation context will provide both the current state (`is`) and the previous state (`was`).
- **Live-Fetch Logic**: 
    - `is` state MUST be fetched from the database immediately before evaluation to ensure the latest data is used.
    - `was` state is a snapshot of the entity *before* the current mutation or pipeline step.
- **Sequential Context Updates**: In a pipeline of multiple steps, after an Action mutates the entity, the system must re-fetch the entity to update the `was` (to the previous `is`) and the `is` (to the new DB state) before the next Condition evaluates. This ensures a "moving window" of state across the execution chain.

### 3. Structural Hashing & Naming (per COND-01, COND-06)
- **Structural Hashing**: Condition logic is deduplicated in the `conditions` table using a SHA-256 hash of the deterministic JSON string (`safe-stable-stringify`).
- **Condition Labels**: User-facing names (aliases) are stored in the `condition_labels` table.
- **Mapping**: Multiple labels can point to the same structural condition record. The `ConditionRepository` MUST handle the logic of "Hash -> Check/Insert Condition -> Upsert Label".

### 4. Modular Operator Registry
- The engine will use a registry pattern for operators (e.g., `eq`, `neq`, `changed`, `changedTo`).
- Adding a new operator should only require registering a new function that implements the `(is, was, expectedValue) => boolean` interface.

## 📋 Impact on Requirements

- **COND-01**: Users name conditions via `condition_labels`.
- **COND-02**: Evaluator must accept a `context` object containing `is` and `was` maps.
- **COND-03**: Operators like `changed` specifically compare `context.was` and `context.is`.
- **COND-05**: Composability is handled by the `logic`/`terms` structure in the AST.
- **COND-06**: `ConditionRepository` ensures structural deduplication.

## 🚀 Execution Split
- **Plan 01**: Core Engine (Types, Registry, Hasher, Evaluator).
- **Plan 02**: Persistence & State (Repository, Context Builder, Label Management).
