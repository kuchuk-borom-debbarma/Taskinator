import React, { useState } from 'react';
import type { ActionTypeDefinition } from './actionTypes';
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from '../Builder/types';

// ─── SmartConfigInput (local variant, mirrors SmartValueInput logic) ──────────

const OTHER_VALUE = '__OTHER__';

interface SmartConfigInputProps {
  inputType: 'text' | 'target-select' | 'field-select' | 'dynamic-value' | 'none';
  label: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  currentField?: string;
}

const SmartConfigInput: React.FC<SmartConfigInputProps> = ({
  inputType,
  label,
  value,
  placeholder,
  onChange,
  currentField,
}) => {
  const [useCustomField, setUseCustomField] = useState(false);
  const [useCustomValue, setUseCustomValue] = useState(false);

  // 1. Target Entity Selector
  if (inputType === 'target-select') {
    const TARGET_OPTIONS = [
      { value: 'self', label: 'Self (Triggering Entity)' },
      { value: 'parent', label: 'Parent Entity' },
      { value: 'project', label: 'Project' },
      { value: 'team', label: 'Team' },
      { value: 'teamMember', label: 'Team Member' },
    ];
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>
        <select
          value={value || 'self'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10 bg-no-repeat"
        >
          {TARGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  // 2. Field Name Selector with custom input fallback
  if (inputType === 'field-select') {
    const FIELD_OPTIONS = [
      { value: 'status', label: 'Status (status)' },
      { value: 'priority', label: 'Priority (priority)' },
      { value: 'title', label: 'Title (title)' },
      { value: 'description', label: 'Description (description)' },
      { value: 'fk_team_id', label: 'Assigned Team ID (fk_team_id)' },
      { value: 'fk_member_id', label: 'Assigned Member ID (fk_member_id)' },
    ];
    const isCustom = value !== '' && !FIELD_OPTIONS.some((f) => f.value === value);

    if (useCustomField || isCustom) {
      return (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Custom field name…"
              autoFocus
              className="flex-1 rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
            />
            <button
              type="button"
              onClick={() => {
                setUseCustomField(false);
                onChange('status');
              }}
              className="rounded-xl border border-app-line bg-white/80 px-3 py-2 text-xs font-semibold text-app-muted transition hover:text-app-ink hover:bg-white"
            >
              Presets
            </button>
          </div>
        </label>
      );
    }

    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>
        <select
          value={value || 'status'}
          onChange={(e) => {
            if (e.target.value === '__CUSTOM__') {
              setUseCustomField(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
        >
          {FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value="__CUSTOM__">Other (Custom Field Name)…</option>
        </select>
      </label>
    );
  }

  // 3. Dynamic Value Selector (Status presets, Priority presets, or free-text)
  if (inputType === 'dynamic-value') {
    let presets = null;
    if (currentField === 'status') presets = TASK_STATUS_OPTIONS;
    else if (currentField === 'priority') presets = TASK_PRIORITY_OPTIONS;

    const isCustomVal = presets != null && value !== '' && !presets.some((p) => String(p.value) === String(value));

    if (!presets) {
      return (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? 'Enter field value…'}
            className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
          />
        </label>
      );
    }

    if (useCustomValue || isCustomVal) {
      return (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>
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
                setUseCustomValue(false);
                onChange(presets ? String(presets[0]?.value) : '');
              }}
              className="rounded-xl border border-app-line bg-white/80 px-3 py-2 text-xs font-semibold text-app-muted transition hover:text-app-ink hover:bg-white"
            >
              Presets
            </button>
          </div>
        </label>
      );
    }

    return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>
        <select
          value={value || String(presets[0]?.value)}
          onChange={(e) => {
            if (e.target.value === OTHER_VALUE) {
              setUseCustomValue(true);
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
        >
          {presets.map((opt) => (
            <option key={opt.value} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
          <option value={OTHER_VALUE}>Other (Custom value)…</option>
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-app-muted">{label}</span>
      <p className="rounded-xl border border-dashed border-app-line px-3 py-2.5 text-sm italic text-app-muted bg-white/40">
        No configuration required
      </p>
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
    const seed: Record<string, any> = { ...initialConfig };
    for (const field of definition.configFields) {
      if (seed[field.key] === undefined) {
        if (field.key === 'target') seed[field.key] = 'self';
        else if (field.key === 'field') seed[field.key] = 'status';
        else if (field.key === 'value') seed[field.key] = seed.field === 'priority' ? '2' : 'TODO';
        else seed[field.key] = '';
      }
    }
    return seed;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Typecast priority to a number if it is priority
    const finalConfig = { ...config };
    if (finalConfig.field === 'priority' && finalConfig.value !== undefined && finalConfig.value !== '') {
      const num = Number(finalConfig.value);
      if (!isNaN(num)) {
        finalConfig.value = num;
      }
    }

    onSubmit(finalConfig);
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
            onChange={(val) => setConfig((prev) => {
              if (field.key === 'field') {
                return {
                  ...prev,
                  field: val,
                  value: val === 'priority' ? '2' : val === 'status' ? 'TODO' : '',
                };
              }
              return { ...prev, [field.key]: val };
            })}
            currentField={config.field}
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
