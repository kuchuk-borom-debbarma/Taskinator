# Validation: Phase 27 - Builder & Canvas Alignment

## 🎯 Phase Goal
Align the visual Builder and Action editors with the v6.0 sequential pipeline model, moving from a "Big Guard Condition" to an interleaved "Condition & Action" list.

## 📋 Success Criteria
- [ ] **Metadata Awareness**: `AutopilotMetadataContext` successfully fetches and provides entity-aware fields.
- [ ] **Recursive AST**: `treeSerializer` and `treeDeserializer` handle GQL `__typename` for recursive unions.
- [ ] **Sequential Interleaving**: `PipelineEditor` correctly renders and reorders mixed `Condition` and `Action` steps.
- [ ] **Trigger Context**: Selecting a trigger in the wizard correctly filters fields in the condition and action editors.
- [ ] **Persistence**: Triggers are persisted and returned by the backend.

## 🧪 Verification Plan

### Automated Tests
| Req ID | Target | Command |
|--------|--------|---------|
| UI-CTX-02 | Metadata Context | `npm test AutopilotMetadataContext` |
| UI-PIPE-01 | Pipeline Interleaving | `npm test PipelineEditor` |
| UI-PIPE-02 | Reordering | `npm test PipelineEditor -- reorder` |
| GQL-01 | Trigger Persistence | `grep -q "triggers JSONB" modular-monolith/database/schema.sql` |

### Manual Verification
1. Create a new Autopilot with "Task Created" trigger.
2. Verify that the "Condition Builder" only shows Task fields (Status, Priority, etc.).
3. Add a Condition, then an Action, then another Condition.
4. Drag the second Condition to the first position.
5. Save and verify the order is preserved in the dashboard.
