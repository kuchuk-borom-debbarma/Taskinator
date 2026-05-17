# Context: Phase 27 - Builder & Canvas Alignment

## 🎯 Goal
Align the visual Builder and Action editors with the v6.0 sequential pipeline model, moving from a "Big Guard Condition" to an interleaved "Condition & Action" list.

## 🛠️ Decisions

### 1. Metadata Discovery (Global Context)
- **Decision**: Use a **Global Context** approach for entity metadata.
- **Implementation**: Fetch `autopilotMetadata` once in `AutopilotDashboardView` and provide it via an `AutopilotMetadataContext`.
- **Rationale**: Reduces redundant API calls when editing multiple nodes and ensures consistency across the Builder and Action forms.

### 2. Sequential Interleaving (The "Logic Block" Model)
- **Decision**: The "Builder" is no longer a standalone wizard step. It will be refactored into a `ConditionStepCard` that can be interleaved with `ActionStepCard` within the `ActionPipelineEditor`.
- **Flow**: The UI will represent the `pipeline` array exactly as stored: `[Condition, Action, Action, Condition, Action]`.
- **UI UX**: Each condition in the sequence will render a "Mini Canvas" or a summary that expands into the XYFlow builder.

### 3. Lazy-Context & Entity Awareness
- **Decision**: Implement **Trigger-Locked Context**. 
- **UX**: The `triggerEntityType` (Project, Task, or Team) selected in the first step of the wizard will be injected into all downstream `PredicateEditorPanel` and `ActionConfigForm` components.
- **Constraint**: Users can only build predicates/actions for fields available on the trigger entity (enforced via metadata filtering).

### 4. AST Synchronization (Type-Safe Unions)
- **Decision**: Update `treeSerializer.ts` and `treeDeserializer.ts` to work directly with the **GQL ConditionNode Union** structure.
- **Implementation**: Internal UI state will include `__typename` (AndNode, OrNode, etc.) to ensure seamless round-tripping without complex mapping at the API layer.

## 📋 Impact on Requirements
- **UI-CTX-02**: Predicate dropdowns will now be dynamically populated from the `AutopilotMetadataContext`.
- **UI-PIPE-01**: `ActionPipelineEditor` becomes the primary orchestration component for the entire rule, not just actions.
- **UI-PIPE-02**: Drag-and-drop reordering will support moving a "Condition Block" between "Action Blocks".

## 🚀 Next Steps
1. **Researcher**: Map the exact prop changes needed for `ConditionBuilderCanvas` to support "Trigger-Locked Context".
2. **Planner**: Design the new `PipelineStep` union-aware `ActionPipelineEditor`.
3. **Execution**: Refactor `CreateAutopilotModal` to use the interleaved flow.
