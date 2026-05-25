import { useState, type PropsWithChildren, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Circle, Clock, X } from 'lucide-react';
import { clsx } from 'clsx';

export function SurfaceCard({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <section className={clsx('surface-card rounded-[24px]', className)}>{children}</section>;
}

export function SurfaceCardStrong({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <section className={clsx('surface-card-strong rounded-[24px]', className)}>{children}</section>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8 animate-fade-in">
      <div className="max-w-3xl space-y-1.5">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-app-ink md:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-app-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5 shrink-0">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = 'orange',
}: {
  label: string;
  value: number | string;
  hint: string;
  accent?: 'orange' | 'teal' | 'ink';
}) {
  const accents = {
    orange: 'bg-app-accent-soft text-app-accent border border-app-accent/10',
    teal: 'bg-app-accent-2-soft text-app-accent-2 border border-app-accent-2/10',
    ink: 'bg-app-ink/5 text-app-ink border border-app-ink/5',
  };

  return (
    <SurfaceCard className="p-6 flex flex-col justify-between min-h-[140px] hover:translate-y-[-2px]">
      <div>
        <div className={clsx('mb-3 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', accents[accent])}>
          {label}
        </div>
        <div className="text-3xl font-extrabold tracking-[-0.04em] text-app-ink">{value}</div>
      </div>
      <p className="mt-2 text-xs text-app-muted">{hint}</p>
    </SurfaceCard>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-4 px-8 py-12 text-center rounded-[24px] border border-dashed border-slate-200/80 bg-white/40 backdrop-blur-md', className)}>
      <div className="rounded-full bg-slate-100 p-4 text-app-muted shadow-inner">
        <Icon size={24} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-app-ink">{title}</h3>
        <p className="max-w-xs text-xs leading-relaxed text-app-muted">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function AppModal({
  open,
  title,
  description,
  onClose,
  children,
  size = 'lg',
}: PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl' | 'full';
}>) {
  if (!open) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] h-[95vh] flex flex-col',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/35 p-4 backdrop-blur-md md:items-center animate-fade-in">
      <div className="absolute inset-0 cursor-default" aria-hidden="true" onClick={onClose} />
      <div className={clsx('surface-card-strong relative z-[110] w-full rounded-[24px] p-6 shadow-2xl md:p-7 border border-slate-200/50 flex flex-col max-h-[90vh]', sizeClasses[size])}>
        <div className="mb-5 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-app-ink">{title}</h2>
            {description ? <p className="mt-1 text-xs text-app-muted leading-relaxed">{description}</p> : null}
          </div>
          <button
            className="group -mr-2 -mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close modal"
          >
            <X size={16} className="text-app-muted transition-colors group-hover:text-app-ink" />
          </button>
        </div>
        <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-app-ink uppercase tracking-wider opacity-90">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:bg-white focus:ring-4 focus:ring-app-accent/5 shadow-sm"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-app-ink uppercase tracking-wider opacity-90">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:bg-white focus:ring-4 focus:ring-app-accent/5 shadow-sm leading-relaxed"
      />
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border', meta.className)}>
      <Icon size={12} className="opacity-95" />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: number }) {
  const meta = getPriorityMeta(priority);
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border', meta.className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

export function LoadingPane({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center animate-fade-in">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-app-accent/20 border-t-app-accent" />
      <div className="space-y-1">
        <h2 className="text-base font-bold text-app-ink">{title}</h2>
        <p className="text-xs text-app-muted max-w-xs">{message}</p>
      </div>
    </div>
  );
}

export function InlineMessage({
  tone,
  message,
}: {
  tone: 'error' | 'success' | 'info';
  message: string;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50/70 text-red-700',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    info: 'border-sky-200 bg-sky-50/70 text-sky-700',
  };

  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;

  return (
    <div className={clsx('flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold', styles[tone])}>
      <Icon size={14} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function formatDate(date?: string | null) {
  if (!date) return 'No date';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeVolume(count: number, singular: string) {
  if (count === 0) return `No ${singular}s yet`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${singular}s`;
}

function getStatusMeta(status: string) {
  switch (status) {
    case 'DONE':
      return {
        label: 'Done',
        icon: CheckCircle2,
        className: 'bg-emerald-50/50 border-emerald-200 text-emerald-700',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In progress',
        icon: Clock,
        className: 'bg-sky-50/50 border-sky-200 text-sky-700',
      };
    case 'TODO':
      return {
        label: 'To do',
        icon: Circle,
        className: 'bg-slate-50/60 border-slate-200 text-slate-600',
      };
    case 'CANCELED':
      return {
        label: 'Canceled',
        icon: X,
        className: 'bg-red-50/50 border-red-200 text-red-600',
      };
    default:
      return {
        label: status || 'Unknown',
        icon: Circle,
        className: 'bg-slate-100 border-slate-300 text-slate-700',
      };
  }
}

function getPriorityMeta(priority: number) {
  if (priority === 0) {
    return { label: 'Urgent', className: 'bg-red-50/50 border-red-200 text-red-700' };
  }
  if (priority === 1) {
    return { label: 'High', className: 'bg-orange-50/50 border-orange-200 text-orange-700' };
  }
  if (priority === 2) {
    return { label: 'Medium', className: 'bg-amber-50/50 border-amber-200 text-amber-700' };
  }
  if (priority === 3) {
    return { label: 'Low', className: 'bg-slate-50/60 border-slate-200 text-slate-500' };
  }
  return { label: `Priority ${priority}`, className: 'bg-slate-100 border-slate-300 text-slate-700' };
}

export function CustomInlineSelect({
  value,
  onChange,
  onClose,
  options,
  type = 'text',
}: {
  value: string | number;
  onChange: (v: any) => void;
  onClose: () => void;
  options: { label: string; value: string | number }[];
  type?: 'text' | 'number';
}) {
  const isCustom = !options.find((o) => String(o.value) === String(value)) && value !== '';
  const [mode, setMode] = useState<'select' | 'input'>(isCustom ? 'input' : 'select');
  const [draft, setDraft] = useState(value);

  const handleInputBlur = () => {
    const val = type === 'number' ? Number(draft) : draft;
    onChange(val);
    onClose();
  };

  if (mode === 'select') {
    return (
      <select
        autoFocus
        value={value}
        onChange={(e) => {
          if (e.target.value === '__OTHER__') {
            setMode('input');
            setDraft('');
          } else {
            const val = type === 'number' ? Number(e.target.value) : e.target.value;
            onChange(val);
            onClose();
          }
        }}
        onBlur={onClose}
        className="w-full rounded-xl border border-slate-200 bg-white/70 px-2 py-1.5 text-xs font-semibold outline-none shadow-sm cursor-pointer focus:border-app-accent focus:bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="__OTHER__">Other (Custom)...</option>
      </select>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleInputBlur();
        } else if (e.key === 'Escape') {
          onClose();
        }
      }}
      onBlur={handleInputBlur}
      placeholder={type === 'number' ? 'Enter a number...' : 'Type custom value...'}
      className="w-full rounded-xl border border-app-accent bg-white px-2 py-1.5 text-xs font-semibold outline-none shadow-sm focus:ring-4 focus:ring-app-accent/5"
    />
  );
}

export function CustomFormSelect({
  label,
  value,
  onChange,
  options,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: any) => void;
  options: { label: string; value: string | number }[];
  type?: 'text' | 'number';
  placeholder?: string;
}) {
  const isCustomValue = !options.find((o) => String(o.value) === String(value)) && value !== '';
  const [isCustom, setIsCustom] = useState(isCustomValue);
  const [customVal, setCustomVal] = useState(isCustomValue ? String(value) : '');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__OTHER__') {
      setIsCustom(true);
      onChange(type === 'number' ? 0 : '');
    } else {
      setIsCustom(false);
      onChange(type === 'number' ? Number(val) : val);
    }
  };

  const handleInputChange = (val: string) => {
    setCustomVal(val);
    onChange(type === 'number' ? Number(val) : val);
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-app-ink uppercase tracking-wider opacity-90">{label}</span>
        <select
          value={isCustom ? '__OTHER__' : value}
          onChange={handleSelectChange}
          className="w-full rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-sm text-app-ink outline-none transition focus:border-app-accent focus:bg-white focus:ring-4 focus:ring-app-accent/5 cursor-pointer shadow-sm"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value="__OTHER__">Other (Custom)...</option>
        </select>
      </label>

      {isCustom && (
        <TextField
          type={type}
          label={`Custom ${label}`}
          value={customVal}
          onChange={handleInputChange}
          placeholder={placeholder || `Enter custom ${label.toLowerCase()}...`}
          required
        />
      )}
    </div>
  );
}
