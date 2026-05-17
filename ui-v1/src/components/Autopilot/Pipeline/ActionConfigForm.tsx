import React, { useState } from 'react';
import { useAutopilotTrigger } from '../AutopilotTriggerContext';
import { useAutopilotMetadata } from '../AutopilotMetadataContext';
import type { ActionTypeDefinition } from './actionTypes';
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from '../Builder/types';

// ─── SmartConfigInput (local variant, mirrors SmartValueInput logic) ──────────

const OTHER_VALUE = '__OTHER__';

interface SmartConfigInputProps {
  inputType: 'text' | 'status-select' | 'priority-select' | 'none';
  label: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  entityType?: string;
}

const SmartConfigInput: React.FC<SmartConfigInputProps> = ({
  inputType,
  label,
  value,
  placeholder,
  onChange,
  entityType,
}) => {
  // In a fully dynamic version, presets could come from AutopilotMetadataContext.
  // For now, we restrict status/priority to 'task' entity type as a safeguard.
  let presets = null;
  if (entityType === 'task') {
    if (inputType === 'status-select') presets = TASK_STATUS_OPTIONS;
    else if (inputType === 'priority-select') presets = TASK_PRIORITY_OPTIONS;
  }

  const [useCustom, setUseCustom] = useState(
    presets != null && value !== '' && !presets.some((p) => p.value === value),
  );

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>

      {inputType === 'none' && (
        <p className="rounded-xl border border-dashed border-app-line px-3 py-2.5 text-sm italic text-app-muted">
          No configuration required
        </p>
      )}

      {(!presets && inputType !== 'none') && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Enter value…'}
          className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
        />
      )}

      {presets && !useCustom && (
        <select
          value={value || presets[0]?.value}
          onChange={(e) => {
            if (e.target.value === OTHER_VALUE) {
              setUseCustom(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
        >
          {presets.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value={OTHER_VALUE}>Other…</option>
        </select>
      )}

      {presets && useCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Custom value…"
            autoFocus
            className="flex-1 rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
          />
          <button
            type="button"
            onClick={() => {
              setUseCustom(false);
              onChange(presets[0]?.value ?? '');
            }}
            className="rounded-xl border border-app-line bg-white/80 px-3 py-2 text-xs font-semibold text-app-muted transition hover:text-app-ink"
          >
            Presets
          </button>
        </div>
      )}
    </label>
  );
};

// ─── ActionConfigForm ─────────────────────────────────────────────────────────

interface ActionConfigFormProps {
  definition: ActionTypeDefinition;
  initialConfig?: Record<string, any>;
  onSubmit: (config: Record<string, any>) => void;
  submitLabel?: string;
}

export const ActionConfigForm: React.FC<ActionConfigFormProps> = ({
  definition,
  initialConfig = {},
  onSubmit,
  submitLabel = 'Apply',
}) => {
  const { selectedEntityType } = useAutopilotTrigger();
  const { getActionsForEntity } = useAutopilotMetadata();

  const [config, setConfig] = useState<Record<string, any>>(() => {
    // Seed defaults
    const seed: Record<string, any> = { ...initialConfig };
    for (const field of definition.configFields) {
      if (seed[field.key] === undefined) {
        if (field.inputType === 'status-select') seed[field.key] = 'TODO';
        else if (field.inputType === 'priority-select') seed[field.key] = '3';
        else seed[field.key] = '';
      }
    }
    return seed;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  const validActions = getActionsForEntity(selectedEntityType);
  const isValidForEntity = validActions.some(a => a.type === definition.key) || validActions.length === 0; // Fallback if metadata not loaded

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isValidForEntity && (
        <div className="p-3 text-xs text-app-warning bg-app-warning/10 rounded-lg border border-app-warning/20">
          Note: This action might not be applicable for {selectedEntityType} triggers.
        </div>
      )}

      {definition.configFields.length === 0 ? (
        <SmartConfigInput
          inputType="none"
          label="Configuration"
          value=""
          onChange={() => {}}
          entityType={selectedEntityType}
        />
      ) : (
        definition.configFields.map((field) => (
          <SmartConfigInput
            key={field.key}
            inputType={field.inputType}
            label={field.label}
            placeholder={field.placeholder}
            value={String(config[field.key] ?? '')}
            onChange={(val) => setConfig((prev) => ({ ...prev, [field.key]: val }))}
            entityType={selectedEntityType}
          />
        ))
      )}

      <button
        type="submit"
        className="mt-4 w-full rounded-full bg-app-accent py-2.5 text-sm font-semibold text-white transition hover:bg-app-accent/90"
      >
        {submitLabel}
      </button>
    </form>
  );
};
