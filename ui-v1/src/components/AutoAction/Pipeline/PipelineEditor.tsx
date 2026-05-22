import React, { useEffect, useState } from 'react';
import { Play, Plus, Hexagon } from 'lucide-react';
import { Reorder } from 'framer-motion';
import type { PipelineStep, AutoActionAction, AutoActionCondition } from '../../../gql/graphql';
import { ActionStepCard } from './ActionStepCard';
import { ConditionStepCard } from '../Builder/ConditionStepCard';
import { ConditionBuilderCanvas } from '../Builder/ConditionBuilderCanvas';
import { PipelineStepConnector } from './PipelineStepConnector';
import { AddActionModal } from './AddActionModal';
import { ActionConfigForm } from './ActionConfigForm';
import { getActionDefinition, normalizeAction } from './actionTypes';
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
  const [editConditionIndex, setEditConditionIndex] = useState<number | null>(null);

  const editAction = editActionIndex !== null ? (draft[editActionIndex] as AutoActionAction) : null;
  const normalizedEditAction = editAction ? normalizeAction(editAction) : null;
  const editDefinition = normalizedEditAction ? getActionDefinition(normalizedEditAction.type) : null;
  const editCondition = editConditionIndex !== null ? (draft[editConditionIndex] as AutoActionCondition) : null;

  useEffect(() => {
    setDraft(pipeline);
    setEditActionIndex(null);
    setEditConditionIndex(null);
  }, [pipeline]);

  const notify = (updated: PipelineStep[]) => {
    // Re-calculate positions for actions after any change (add/remove/reorder)
    const withPositions = updated.map((item, i) => {
      if (item.__typename === 'AutoActionAction') {
        return { ...item, position: i + 1 } as AutoActionAction;
      }
      return item;
    });
    setDraft(withPositions);
    onChange?.(withPositions);
  };

  const handleAddAction = (incoming: { type: string; config: Record<string, any>; position: number }) => {
    const newAction: any = {
      __typename: 'AutoActionAction',
      id: `draft-action-${Date.now()}`,
      type: incoming.type,
      config: incoming.config,
      position: draft.length + 1,
    };
    notify([...draft, newAction]);
  };

  const handleAddCondition = () => {
    const newCondition: AutoActionCondition = {
      __typename: 'AutoActionCondition',
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

  const handleEditConditionSave = (definition: any) => {
    if (editConditionIndex === null) return;
    const updated = draft.map((item, i) =>
      i === editConditionIndex ? { ...item, definition } : item,
    );
    notify(updated as PipelineStep[]);
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
      {!readOnly && editActionIndex !== null && normalizedEditAction && editDefinition && (
        <AppModal
          open
          onClose={() => setEditActionIndex(null)}
          title={`Edit: ${editDefinition.label}`}
        >
          <ActionConfigForm
            definition={editDefinition}
            initialConfig={normalizedEditAction.config as Record<string, any>}
            onSubmit={handleEditActionSave}
            submitLabel="Save Changes"
          />
        </AppModal>
      )}
      {/* Edit Condition Modal */}
      {!readOnly && editConditionIndex !== null && editCondition && (
        <AppModal
          open
          onClose={() => setEditConditionIndex(null)}
          title={`Edit: ${editCondition.name || 'Logic Block'}`}
          size="xl"
        >
          <div className="relative h-[480px] w-full mt-2 flex flex-col gap-4">
            <div className="flex-1 relative border border-app-line rounded-[20px] overflow-hidden bg-app-slate-soft">
              <ConditionBuilderCanvas
                initialCondition={editCondition.definition as any}
                onChange={handleEditConditionSave}
              />
            </div>
            <div className="flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditConditionIndex(null)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-app-line bg-white/60 px-5 py-2.5 text-sm font-semibold text-app-muted transition hover:bg-white hover:text-app-ink"
              >
                Close
              </button>
            </div>
          </div>
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
              const itemId = item.__typename === 'AutoActionAction'
                ? (item as AutoActionAction).id
                : (item as AutoActionCondition).id;

              const nextStep = displayPipeline[index + 1];

              return (
                <Reorder.Item
                  key={itemId}
                  value={item}
                  dragListener={!readOnly}
                  className="relative"
                >
                  {item.__typename === 'AutoActionAction' ? (
                    <ActionStepCard
                      action={item as any}
                      index={index}
                      readOnly={readOnly}
                      onEdit={setEditActionIndex}
                      onRemove={handleRemove}
                    />
                  ) : (
                    <ConditionStepCard
                      condition={item as AutoActionCondition}
                      index={index}
                      readOnly={readOnly}
                      onEdit={setEditConditionIndex}
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
