# Context: Phase 25 - Pipeline Orchestrator

## 🎯 Goal
Wire the conditions and actions into strict ordered execution pipelines that halt on condition failures, using a resumable and scalable event-driven architecture.

## 🛠️ Decisions

### 1. Pipeline Step Structure (ID References)
- The `autopilot.steps` JSON array will store an ordered list of step references.
- Schema: `{ "type": "condition" | "action", "refId": "structural_hash" }`.
- Downstream agents will use `ConditionRepository` and `ActionRepository` to fetch the actual ASTs by `refId`.

### 2. Resumable Execution (Event-Driven Loop)
- To prevent long-running DB transactions and blocking, the orchestrator will execute the pipeline **one step at a time**.
- After an **Action** step executes and its changes are persisted, the engine will emit a new event (or recursively call itself with an index increment) to trigger the next step.
- This allows for "checkpointing" the pipeline state.

### 3. Smart Aggregation & Bulk Operations
- The orchestrator will support a "Smart Aggregator" pattern.
- Pending actions from different autopilots or projects can be grouped by target entity or field to perform optimized bulk updates.
- This minimizes the "10k RPS" pressure on the database.

### 4. Halt Semantics & Loop Detection
- **Strict Halt (PIPE-03)**: If a `condition` step evaluates to `false`, the entire pipeline for that Autopilot instance halts immediately.
- **TraceID + Depth Counter**: Every pipeline execution will carry a `traceId` and a `depth` counter. If `depth` exceeds a system limit (e.g., 50), execution halts to prevent infinite loops.

### 5. Moving Window State Management
- Between steps, the `is` state (live fetch) and `was` state (previous `is`) must be synchronized.
- The `ContextualEntity` and `ContextBuilder` from Phase 24 will be used to ensure each step sees the effects of previous actions.

## 📋 Impact on Requirements

- **PIPE-01**: Handled by the JSON array structure in `autopilot` table.
- **PIPE-02**: Arbitrary shapes supported by treating every index in the array as a discrete step.
- **PIPE-03**: Logic implemented in the orchestrator's step-processing loop.
- **Loop Detection**: Integrated into the execution context.

## 🚀 Next Steps
1. Researcher will investigate the best way to implement the "event-driven loop" (e.g., recursive Kafka events vs. an internal task queue).
2. Planner will design the `PipelineOrchestrator` class and the `SmartAggregator` interface.
