import React, { useState } from 'react';
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
}

const SmartConfigInput: React.FC<SmartConfigInputProps> = ({
  inputType,
  label,
  value,
  placeholder,
  onChange,
}) => {
  const presets =
    inputType === 'status-select'
      ? TASK_STATUS_OPTIONS
      : inputType === 'priority-select'
        ? TASK_PRIORITY_OPTIONS
        : null;

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

      {inputType === 'text' && (
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {definition.configFields.length === 0 ? (
        <SmartConfigInput
          inputType="none"
          label="Configuration"
          value=""
          onChange={() => {}}
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
