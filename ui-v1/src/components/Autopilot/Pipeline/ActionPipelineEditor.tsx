import React, { useState } from 'react';
import { Play, Plus, ArrowDown } from 'lucide-react';
import type { AutopilotAction } from '../../../api/interfaces/AutopilotAPI';
import { ActionStepCard } from './ActionStepCard';
import { AddActionModal } from './AddActionModal';
import { ActionConfigForm } from './ActionConfigForm';
import { getActionDefinition } from './actionTypes';
import { AppModal } from '../../shared/workspace';

interface ActionPipelineEditorProps {
  actions: AutopilotAction[];
  readOnly?: boolean;
  onChange?: (actions: AutopilotAction[]) => void;
}

// Connector arrow between steps
const StepConnector: React.FC = () => (
  <div className="flex flex-col items-center py-1">
    <div className="h-3 w-px bg-app-line/60" />
    <ArrowDown size={12} className="text-app-muted/60" />
    <div className="h-3 w-px bg-app-line/60" />
  </div>
);

export const ActionPipelineEditor: React.FC<ActionPipelineEditorProps> = ({
  actions,
  readOnly = false,
  onChange,
}) => {
  const [draft, setDraft] = useState<AutopilotAction[]>(actions);
  const [addOpen, setAddOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const editAction = editIndex !== null ? draft[editIndex] : null;
  const editDefinition = editAction ? getActionDefinition(editAction.type) : null;

  const notify = (updated: AutopilotAction[]) => {
    setDraft(updated);
    onChange?.(updated);
  };

  const handleAdd = (incoming: { type: string; config: Record<string, any>; position: number }) => {
    const newAction: AutopilotAction = {
      id: `draft-${Date.now()}`,
      type: incoming.type,
      config: incoming.config,
      position: draft.length + 1,
    };
    notify([...draft, newAction]);
  };

  const handleRemove = (index: number) => {
    const updated = draft
      .filter((_, i) => i !== index)
      .map((a, i) => ({ ...a, position: i + 1 }));
    notify(updated);
  };

  const handleEditSave = (config: Record<string, any>) => {
    if (editIndex === null) return;
    const updated = draft.map((a, i) =>
      i === editIndex ? { ...a, config } : a,
    );
    notify(updated);
    setEditIndex(null);
  };

  const displayActions = readOnly ? actions : draft;

  return (
    <>
      {/* Add Action Modal */}
      {!readOnly && (
        <AddActionModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          nextPosition={draft.length + 1}
          onAdd={handleAdd}
        />
      )}

      {/* Edit Modal */}
      {!readOnly && editIndex !== null && editAction && editDefinition && (
        <AppModal
          open
          onClose={() => setEditIndex(null)}
          title={`Edit: ${editDefinition.label}`}
        >
          <ActionConfigForm
            definition={editDefinition}
            initialConfig={editAction.config as Record<string, any>}
            onSubmit={handleEditSave}
            submitLabel="Save Changes"
          />
        </AppModal>
      )}

      {/* Pipeline */}
      <div className="flex flex-col">
        {displayActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-ink/5">
              <Play size={20} className="text-app-muted" />
            </div>
            <p className="text-sm text-app-muted">No actions configured</p>
          </div>
        ) : (
          displayActions.map((action, index) => (
            <React.Fragment key={action.id}>
              <ActionStepCard
                action={action}
                index={index}
                readOnly={readOnly}
                onEdit={setEditIndex}
                onRemove={handleRemove}
              />
              {index < displayActions.length - 1 && <StepConnector />}
            </React.Fragment>
          ))
        )}

        {/* Add Action button */}
        {!readOnly && (
          <button
            onClick={() => setAddOpen(true)}
            className="mt-3 inline-flex items-center justify-center gap-2 self-center rounded-full border border-dashed border-app-accent/40 bg-app-accent-soft px-5 py-2 text-sm font-semibold text-app-accent transition hover:bg-app-accent/15"
          >
            <Plus size={15} />
            Add Action
          </button>
        )}
      </div>
    </>
  );
};
