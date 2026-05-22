import React, { useState } from 'react';
import {
  Activity,
} from 'lucide-react';
import { AppModal } from '../../shared/workspace';
import { DynamicActionForm } from './DynamicActionForm';
import { useAutoActionMetadata } from '../AutoActionMetadataContext';

// ─── Action type picker card ──────────────────────────────────────────────────

const ActionTypeTile: React.FC<{
  template: any;
  selected: boolean;
  onClick: () => void;
}> = ({ template, selected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col gap-2 rounded-[14px] border p-4 text-left transition
        ${selected
          ? 'border-app-accent bg-app-accent-soft ring-2 ring-app-accent/20'
          : 'border-app-line bg-white/60 hover:border-app-accent/30 hover:bg-white/90'
        }
      `}
    >
      <div
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
          selected ? 'bg-app-accent text-white' : 'bg-app-ink/8 text-app-muted'
        }`}
      >
        <Activity size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-app-ink">{template.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-app-muted line-clamp-2">{template.description}</p>
      </div>
    </button>
  );
};

// ─── AddActionModal ───────────────────────────────────────────────────────────

interface AddActionModalProps {
  open: boolean;
  onClose: () => void;
  nextPosition: number;
  onAdd: (action: { type: string; config: Record<string, any>; position: number }) => void;
}

export const AddActionModal: React.FC<AddActionModalProps> = ({
  open,
  onClose,
  nextPosition,
  onAdd,
}) => {
  const { template, isLoading } = useAutoActionMetadata();
  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [selectedId, setSelectedId] = useState<string>('');

  const actions = template?.actions || [];
  const selectedDef = actions.find((a: any) => a.id === selectedId);

  const handleClose = () => {
    setStep('pick');
    setSelectedId('');
    onClose();
  };

  const handleAdd = (config: Record<string, any>) => {
    onAdd({ type: selectedId, config, position: nextPosition });
    handleClose();
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title={step === 'pick' ? 'Choose Action Type' : `Configure: ${selectedDef?.name}`}
      description={
        step === 'pick'
          ? 'Select what this step should do when the autoAction fires.'
          : 'Set the parameters for this action.'
      }
    >
      {step === 'pick' ? (
        <div className="space-y-4">
          {isLoading ? (
             <div className="grid grid-cols-2 gap-3">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="h-28 animate-pulse rounded-[14px] bg-app-line/20" />
               ))}
             </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {actions.map((def: any) => (
                <ActionTypeTile
                  key={def.id}
                  template={def}
                  selected={selectedId === def.id}
                  onClick={() => setSelectedId(def.id)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep('configure')}
            disabled={!selectedId}
            className="mt-2 w-full rounded-full bg-app-accent py-2.5 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-50"
          >
            Next: Configure →
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setStep('pick')}
            className="mb-4 text-xs font-semibold text-app-accent hover:underline"
          >
            ← Change action type
          </button>

          {selectedDef && (
            <DynamicActionForm
              schema={selectedDef.inputSchema}
              onSubmit={handleAdd}
              submitLabel="Add to Pipeline"
            />
          )}
        </div>
      )}
    </AppModal>
  );
};
