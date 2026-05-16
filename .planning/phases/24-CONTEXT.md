# Context: Phase 24 - Action Engine & Lazy Resolution

## 🎯 Goal
Build the getter/setter sequence processor with lazy context resolvers for runtime entities.

## 🛠️ Decisions

### 1. Action Step AST (Target-Field-Value)
- Actions are sequences of steps. Each step targets a specific entity and performs an operation.
- Example Step: `{ "target": "self", "field": "status", "operation": "set", "value": "DONE" }`
- Supported targets: `self`, `parent`, `project`, `team`, `teamMember`.

### 2. Lazy Resolution (Async Resolver Registry)
- Related entities (like `parent` or `project`) are only fetched if a step's `target` requires them.
- This is implemented via an `AsyncResolverRegistry` where functions take the triggering entity (`self`) and return the resolved entity data.
- The executor will check if a target is already resolved; if not, it will invoke the corresponding resolver.

### 3. Getter/Setter API (Formal Wrapper Class)
- Entities will be wrapped in a `ContextualEntity` class during execution.
- This class provides `.get(fieldName)` and `.set(fieldName, value)` methods (ACT-03).
- The `.set()` method will track changes for final persistence (or "Live" persistence depending on implementation details in research).

### 4. Structural Hashing (Consistency)
- Similar to Conditions, Actions will be deduplicated using structural hashing (SHA-256 of deterministic JSON).
- The hash serves as the primary key in the `actions` table.
- User-friendly names are stored in `action_labels`.

## 📋 Impact on Requirements

- **ACT-01**: Creating a named action inserts into `actions` (if hash new) and creates an `action_labels` entry.
- **ACT-02**: Lazy resolution is handled by the `AsyncResolverRegistry` and the executor.
- **ACT-03**: The `ContextualEntity` wrapper enforces the structured API.

## 🚀 Next Steps
1. Researcher will design the `ContextualEntity` wrapper and the `AsyncResolverRegistry`.
2. Planner will design the `ActionExecutor` and the `ActionRepository`.
