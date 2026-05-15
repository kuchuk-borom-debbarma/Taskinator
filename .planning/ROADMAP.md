# Roadmap - Milestone v3.0: Remotion Overhaul & Autopilot Showcase

## Phase 15: Refactoring Baseline
- [x] **REFACTOR-01**: Refactor `FeatureShowcase` to use Remotion interpolation/springs instead of CSS animations.
- [x] **REFACTOR-02**: Refactor `SchemaDesign` and its 6 sub-scenes (`QueryProblem`, `ClosureTableSolution`, etc.) to use proper easing and sequencing.
- [x] **REFACTOR-03**: Refactor `SyncArchitecture` (including `BlockingProblem` and `AsyncSolution`) using best practice hooks.

### Success Criteria
1. `FeatureShowcase` renders cleanly via `npx remotion still` without console warning logs regarding CSS animations.
2. All 6 ER-schema design sub-scenes exhibit fluid spring-based table builds.
3. Thread blocking sequences (`SyncArchitecture`) function identically but ported to timeline hooks.

---

## Phase 16: Refactoring Scale
- [x] **REFACTOR-04**: Refactor `AsyncProblems` (Dual-Write & Lost Event) with correct Remotion lifecycle animations.
- [x] **REFACTOR-05**: Refactor `TransactionalOutbox` and `UpgradedAsyncFlow` with clean timeline layouts.
- [x] **REFACTOR-06**: Refactor `ConcurrencyControl` with robust spring-based node animations.

### Success Criteria
1. Outbox relay dispatch animations use `Easing` interpolations.
2. Concurrency control (delta updates) node increments synchronize correctly with spring frame values.

---

## Phase 17: Autopilot Engine Visuals
- [x] **AUTOPILOT-01**: Create composition `AutopilotOverview` showcasing the event-driven automation trigger loop.
- [x] **AUTOPILOT-02**: Create composition `ConditionEvaluator` visualizing live-DB evaluation of nested Boolean trees.
- [x] **AUTOPILOT-03**: Create composition `ActionChain` illustrating linked-list, fail-fast atomicity for automation steps.
- [x] **AUTOPILOT-04**: Create composition `LoopDetector` illustrating the `TraceID` + depth-based prevention mechanic.

### Success Criteria
1. Reactive trigger overview composition successfully showcases event flows.
2. Condition evaluator visually splits recursive AND/OR branches.
3. Link-list fail-fast action chains render sequential execution halts.
4. Max-depth infinite cycle detector triggers visually distinct loop termination animation.

---

## Phase 18: Autopilot UI Visuals
- [x] **AUTOUI-01**: Create composition `VisualConditionBuilder` showing React XYFlow node serialization into logical JSON trees.
- [x] **AUTOUI-02**: Create composition `ActionPipelineEditor` visualizing drag-and-drop sequential steps and zero-latency optimistic UI toggles.
- [x] **AUTOUI-03**: Create composition `DynamicConfig` showcasing overlay config forms and smart fallback selectors.

### Success Criteria
1. XYFlow serialization renders animated nodes converting to compact JSON trees.
2. Optimistic pipeline toggle responds with immediate visual confirmation in-frame.
3. Configuration overlay displays smart dropdown inputs with spring scaling.

---

## Phase 19: Finale & Master Assembly
- [ ] **FINALE-01**: Implement composition `SmartAggregation` (two-phase event batching).
- [ ] **FINALE-02**: Implement composition `ChunkedDeletion` (self-signaling pac-man cascade delete).
- [ ] **FINALE-03**: Implement composition `RealtimeSSE` (Redis pub-sub bridge + WebSocket push).
- [ ] **FINALE-04**: Implement composition `FinalArchitecture` with the unified system diagram & 10k RPS metrics overlay.
- [ ] **FINALE-05**: Assemble the master timeline in `src/Root.tsx` verifying all sequence durations and transitions.

### Success Criteria
1. Pac-Man background chunked deletion scene successfully plays.
2. Final monolithic architecture diagram connects Client, GraphQL, Redis, Kafka, and DB seamlessly.
3. Master `Root.tsx` video compiles and renders a sample still frame of each composition.

---
*Note: Previous milestones archived in `.planning/milestones/`*
