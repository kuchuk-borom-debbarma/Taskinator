import React, { useState } from 'react';

interface DynamicActionFormProps {
  schema: any; // JSON Schema
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  submitLabel?: string;
}

export const DynamicActionForm: React.FC<DynamicActionFormProps> = ({
  schema,
  initialValues = {},
  onSubmit,
  submitLabel = 'Apply',
}) => {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaultValues: Record<string, any> = {};
    if (schema?.properties) {
      Object.keys(schema.properties).forEach((key) => {
        defaultValues[key] = initialValues[key] ?? schema.properties[key].default ?? '';
      });
    }
    return defaultValues;
  });

  const handleChange = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="rounded-xl border border-dashed border-app-line px-3 py-2.5 text-sm italic text-app-muted bg-white/40 text-center">
          No configuration required
        </p>
        <button
          type="submit"
          className="mt-2 w-full rounded-full bg-app-accent py-2.5 text-sm font-semibold text-white transition hover:bg-app-accent/90"
        >
          {submitLabel}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
        const label = prop.title || key.charAt(0).toUpperCase() + key.slice(1);
        const description = prop.description;

        return (
          <div key={key} className="space-y-1.5">
            <label className="block text-xs font-medium text-app-muted">
              {label}
              {schema.required?.includes(key) && <span className="text-app-danger ml-0.5">*</span>}
            </label>
            
            {prop.enum ? (
              <select
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
              >
                {prop.enum.map((opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : prop.type === 'boolean' ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!values[key]}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="h-4 w-4 rounded border-app-line text-app-accent focus:ring-app-accent/20"
                />
                <span className="text-sm text-app-ink">{description || 'Enable this option'}</span>
              </div>
            ) : prop.type === 'integer' || prop.type === 'number' ? (
              <input
                type="number"
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={prop.examples?.[0] || `Enter ${key}...`}
                className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
              />
            ) : (
              <input
                type="text"
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={prop.examples?.[0] || `Enter ${key}...`}
                className="w-full rounded-xl border border-app-line bg-white/85 px-3 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
              />
            )}
            
            {description && prop.type !== 'boolean' && (
              <p className="text-[10px] text-app-muted italic px-1">{description}</p>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        className="mt-2 w-full rounded-full bg-app-accent py-2.5 text-sm font-semibold text-white transition hover:bg-app-accent/90"
      >
        {submitLabel}
      </button>
    </form>
  );
};
