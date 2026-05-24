import type { ValueTemplate } from '../../api/interfaces/AutomationAPI';
import { TextField } from '../shared/workspace';

interface RendererProps {
  template: ValueTemplate;
  value: string;
  onChange: (value: string) => void;
  projectStatuses: string[];
}

export function AutomationFormRenderer({
  template,
  value,
  onChange,
  projectStatuses,
}: RendererProps) {
  if (template.inputType === 'NONE') return null;

  if (template.inputType === 'TEXT' || template.inputType === 'NUMBER') {
    return (
      <TextField
        label={template.label}
        value={value}
        onChange={onChange}
        placeholder={template.placeholder ?? undefined}
        type={template.inputType === 'NUMBER' ? 'number' : 'text'}
      />
    );
  }

  if (template.inputType === 'SELECT') {
    const options =
      template.dynamicOptionsSource === 'PROJECT_STATUSES'
        ? projectStatuses.map((status) => ({ value: status, label: formatStatusLabel(status) }))
        : template.staticOptions ?? [];

    return (
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-app-ink">{template.label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return null;
}

export function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
