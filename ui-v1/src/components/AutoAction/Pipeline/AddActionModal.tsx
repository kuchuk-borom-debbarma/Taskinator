import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  UserMinus,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { AppModal } from '../../shared/workspace';
import { ACTION_TYPE_REGISTRY, type ActionTypeDefinition } from './actionTypes';
import { ActionConfigForm } from './ActionConfigForm';

// ─── Icon resolver ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle2,
  AlertTriangle,
  Users,
  UserCheck,
  UserMinus,
  UserX,
};

// ─── Action type picker card ──────────────────────────────────────────────────

const ActionTypeTile: React.FC<{
  definition: ActionTypeDefinition;
  selected: boolean;
  onClick: () => void;
}> = ({ definition, selected, onClick }) => {
  const Icon = ICON_MAP[definition.icon] ?? CheckCircle2;

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
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-semibold text-app-ink">{definition.label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-app-muted">{definition.description}</p>
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
  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [selectedKey, setSelectedKey] = useState<string>(ACTION_TYPE_REGISTRY[0]?.key ?? '');

  const selectedDef = ACTION_TYPE_REGISTRY.find((d) => d.key === selectedKey);

  const handleClose = () => {
    setStep('pick');
    setSelectedKey(ACTION_TYPE_REGISTRY[0]?.key ?? '');
    onClose();
  };

  const handleAdd = (config: Record<string, any>) => {
    onAdd({ type: selectedKey, config, position: nextPosition });
    handleClose();
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title={step === 'pick' ? 'Choose Action Type' : `Configure: ${selectedDef?.label}`}
      description={
        step === 'pick'
          ? 'Select what this step should do when the autoAction fires.'
          : 'Set the parameters for this action.'
      }
    >
      {step === 'pick' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {ACTION_TYPE_REGISTRY.map((def) => (
              <ActionTypeTile
                key={def.key}
                definition={def}
                selected={selectedKey === def.key}
                onClick={() => setSelectedKey(def.key)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep('configure')}
            disabled={!selectedKey}
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
            <ActionConfigForm
              definition={selectedDef}
              onSubmit={handleAdd}
              submitLabel="Add to Pipeline"
            />
          )}
        </div>
      )}
    </AppModal>
  );
};
