import React, { useState, useCallback } from 'react';
import {
  DOMAIN_FIELDS,
  OPERATORS,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
} from './types';
import type { PredicateNodeData } from './types';

interface SmartValueInputProps {
  domain: string;
  field: string;
  value: string;
  onChange: (value: string) => void;
}

const OTHER_VALUE = '__OTHER__';

function getPresetOptions(domain: string, field: string): { value: string; label: string }[] | null {
  if (domain === 'task') {
    if (field === 'status') return TASK_STATUS_OPTIONS;
    if (field === 'priority') return TASK_PRIORITY_OPTIONS;
  }
  return null;
}

export const SmartValueInput: React.FC<SmartValueInputProps> = ({
  domain,
  field,
  value,
  onChange,
}) => {
  const presets = getPresetOptions(domain, field);
  const isPresetValue = presets?.some((p) => p.value === value) ?? false;
  const [useCustom, setUseCustom] = useState(!isPresetValue && value !== '');

  if (!presets) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter value..."
        className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
      />
    );
  }

  if (useCustom) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Custom value..."
          className="flex-1 rounded-xl border border-app-line bg-white/85 px-3 py-2 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
          autoFocus
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
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === OTHER_VALUE) {
          setUseCustom(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
    >
      {presets.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      <option value={OTHER_VALUE}>Other...</option>
    </select>
  );
};

// ─── PredicateEditorPanel ─────────────────────────────────────────────────────

interface PredicateEditorPanelProps {
  nodeId: string;
  data: PredicateNodeData;
  onUpdate: (nodeId: string, data: Partial<PredicateNodeData>) => void;
  onRemove: (nodeId: string) => void;
  onClose: () => void;
}

const domains = [
  { value: 'task', label: 'Task' },
  { value: 'project', label: 'Project' },
];

export const PredicateEditorPanel: React.FC<PredicateEditorPanelProps> = ({
  nodeId,
  data,
  onUpdate,
  onRemove,
  onClose,
}) => {
  const [draft, setDraft] = useState<PredicateNodeData>({ ...data });
  const fieldsForDomain = DOMAIN_FIELDS[draft.domain] ?? [];

  const set = (key: keyof PredicateNodeData, val: string) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: val };
      // Reset field when domain changes
      if (key === 'domain') {
        next.field = DOMAIN_FIELDS[val]?.[0]?.value ?? '';
        next.value = '';
      }
      return next;
    });
  };

  const handleApply = () => {
    onUpdate(nodeId, draft);
    onClose();
  };

  const handleRemove = () => {
    onRemove(nodeId);
    onClose();
  };

  return (
    <div className="surface-card-strong absolute right-3 top-3 z-10 w-72 rounded-[20px] p-5 shadow-float">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-app-ink">Edit Predicate</h3>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-app-muted transition hover:bg-app-line/40 hover:text-app-ink"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Domain */}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-app-muted">Domain</span>
          <select
            value={draft.domain}
            onChange={(e) => set('domain', e.target.value)}
            className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2 text-sm text-app-ink outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
          >
            {domains.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>

        {/* Field */}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-app-muted">Field</span>
          <select
            value={draft.field}
            onChange={(e) => set('field', e.target.value)}
            className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2 text-sm text-app-ink outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
          >
            {fieldsForDomain.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>

        {/* Operator */}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-app-muted">Operator</span>
          <select
            value={draft.operator}
            onChange={(e) => set('operator', e.target.value)}
            className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2 text-sm text-app-ink outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </label>

        {/* Value */}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-app-muted">Value</span>
          <SmartValueInput
            domain={draft.domain}
            field={draft.field}
            value={draft.value}
            onChange={(v) => set('value', v)}
          />
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleRemove}
          className="flex-1 rounded-full border border-app-danger/20 bg-app-danger/10 py-2.5 text-sm font-semibold text-app-danger transition hover:bg-app-danger/15"
        >
          Remove
        </button>
        <button
          onClick={handleApply}
          className="flex-1 rounded-full bg-app-accent py-2.5 text-sm font-semibold text-white transition hover:bg-app-accent/90"
        >
          Apply
        </button>
      </div>
    </div>
  );
};
