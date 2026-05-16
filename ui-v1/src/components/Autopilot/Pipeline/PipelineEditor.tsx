import React, { useState } from 'react';
import { Play, Plus, ArrowDown, Hexagon } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import type { PipelineStep, AutopilotAction, AutopilotCondition } from '../../../gql/graphql';
import { ActionStepCard } from './ActionStepCard';
import { ConditionStepCard } from '../Builder/ConditionStepCard';
import { PipelineStepConnector } from './PipelineStepConnector';
import { AddActionModal } from './AddActionModal';
import { ActionConfigForm } from './ActionConfigForm';
import { getActionDefinition } from './actionTypes';
import { AppModal } from '../../shared/workspace';

interface PipelineEditorProps {
  pipeline: PipelineStep[];
  readOnly?: boolean;
  onChange?: (pipeline: PipelineStep[]) => void;
}

export const PipelineEditor: React.FC<PipelineEditorProps> = ({
  pipeline,
  readOnly = false,
  onChange,
}) => {
  const [draft, setDraft] = useState<PipelineStep[]>(pipeline);
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [editActionIndex, setEditActionIndex] = useState<number | null>(null);

  const editAction = editActionIndex !== null ? (draft[editActionIndex] as AutopilotAction) : null;
  const editDefinition = editAction ? getActionDefinition(editAction.type) : null;

  const notify = (updated: PipelineStep[]) => {
    // Re-calculate positions for actions after any change (add/remove/reorder)
    const withPositions = updated.map((item, i) => {
      if (item.__typename === 'AutopilotAction') {
        return { ...item, position: i + 1 } as AutopilotAction;
      }
      return item;
    });
    setDraft(withPositions);
    onChange?.(withPositions);
  };

  const handleAddAction = (incoming: { type: string; config: Record<string, any>; position: number }) => {
    const newAction: AutopilotAction = {
      __typename: 'AutopilotAction',
      id: `draft-action-${Date.now()}`,
      type: incoming.type,
      config: incoming.config,
      position: draft.length + 1,
    };
    notify([...draft, newAction]);
  };

  const handleAddCondition = () => {
    const newCondition: AutopilotCondition = {
      __typename: 'AutopilotCondition',
      id: `draft-cond-${Date.now()}`,
      name: 'New Logic Block',
      definition: {
        __typename: 'AndNode',
        children: [],
      },
    };
    notify([...draft, newCondition]);
  };

  const handleRemove = (index: number) => {
    const updated = draft.filter((_, i) => i !== index);
    notify(updated);
  };

  const handleEditActionSave = (config: Record<string, any>) => {
    if (editActionIndex === null) return;
    const updated = draft.map((item, i) =>
      i === editActionIndex ? { ...item, config } : item,
    );
    notify(updated as PipelineStep[]);
    setEditActionIndex(null);
  };

  const displayPipeline = readOnly ? pipeline : draft;

  return (
    <>
      {/* Add Action Modal */}
      {!readOnly && (
        <AddActionModal
          open={addActionOpen}
          onClose={() => setAddActionOpen(false)}
          nextPosition={draft.length + 1}
          onAdd={handleAddAction}
        />
      )}

      {/* Edit Action Modal */}
      {!readOnly && editActionIndex !== null && editAction && editDefinition && (
        <AppModal
          open
          onClose={() => setEditActionIndex(null)}
          title={`Edit: ${editDefinition.label}`}
        >
          <ActionConfigForm
            definition={editDefinition}
            initialConfig={editAction.config as Record<string, any>}
            onSubmit={handleEditActionSave}
            submitLabel="Save Changes"
          />
        </AppModal>
      )}

      {/* Pipeline */}
      <div className="flex flex-col">
        {displayPipeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-ink/5">
              <Play size={20} className="text-app-muted" />
            </div>
            <p className="text-sm text-app-muted">Pipeline is empty</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={draft}
            onReorder={notify}
            className="flex flex-col"
          >
            {displayPipeline.map((item, index) => {
              const itemId = item.__typename === 'AutopilotAction' 
                ? (item as AutopilotAction).id 
                : (item as AutopilotCondition).id;
              
              const nextStep = displayPipeline[index + 1];
              
              return (
                <Reorder.Item
                  key={itemId}
                  value={item}
                  dragListener={!readOnly}
                  className="relative"
                >
                  {item.__typename === 'AutopilotAction' ? (
                    <ActionStepCard
                      action={item as AutopilotAction}
                      index={index}
                      readOnly={readOnly}
                      onEdit={setEditActionIndex}
                      onRemove={handleRemove}
                    />
                  ) : (
                    <ConditionStepCard
                      condition={item as AutopilotCondition}
                      index={index}
                      readOnly={readOnly}
                      onEdit={() => {}} // TODO: Handle condition editing
                      onRemove={handleRemove}
                    />
                  )}
                  {nextStep && (
                    <PipelineStepConnector previousStep={item} nextStep={nextStep} />
                  )}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}

        {/* Controls */}
        {!readOnly && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setAddActionOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-app-accent/40 bg-app-accent-soft px-4 py-2 text-sm font-semibold text-app-accent transition hover:bg-app-accent/15"
            >
              <Plus size={14} />
              Add Action
            </button>
            <button
              onClick={handleAddCondition}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-app-warning/40 bg-app-warning/5 px-4 py-2 text-sm font-semibold text-app-warning transition hover:bg-app-warning/10"
            >
              <Hexagon size={14} />
              Add Logic
            </button>
          </div>
        )}
      </div>
    </>
  );
};
