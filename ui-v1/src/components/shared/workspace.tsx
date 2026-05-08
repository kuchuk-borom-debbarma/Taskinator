import type { PropsWithChildren, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Circle, Clock, X } from 'lucide-react';
import { clsx } from 'clsx';

export function SurfaceCard({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <section className={clsx('surface-card rounded-[28px]', className)}>{children}</section>;
}

export function SurfaceCardStrong({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <section className={clsx('surface-card-strong rounded-[32px]', className)}>{children}</section>;
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
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="eyebrow mb-3">{eyebrow}</div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-app-ink md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-app-muted md:text-base">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
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
    orange: 'bg-app-accent/10 text-app-accent',
    teal: 'bg-app-accent-2-soft text-app-accent-2',
    ink: 'bg-app-ink/8 text-app-ink',
  };

  return (
    <SurfaceCard className="p-5">
      <div className={clsx('mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold', accents[accent])}>
        {label}
      </div>
      <div className="text-3xl font-semibold tracking-[-0.05em] text-app-ink">{value}</div>
      <p className="mt-2 text-sm text-app-muted">{hint}</p>
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
    <SurfaceCard className={clsx('flex flex-col items-center justify-center gap-4 px-8 py-14 text-center', className)}>
      <div className="rounded-full bg-app-ink/5 p-4 text-app-muted">
        <Icon size={26} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-app-ink">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-app-muted">{description}</p>
      </div>
      {action}
    </SurfaceCard>
  );
}

export function AppModal({
  open,
  title,
  description,
  onClose,
  children,
}: PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111827]/40 p-4 backdrop-blur-sm md:items-center">
      <div className="absolute inset-0 cursor-default" aria-hidden="true" onClick={onClose} />
      <div className="surface-card-strong relative z-[110] w-full max-w-lg rounded-[28px] p-6 shadow-2xl md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-app-ink">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-6 text-app-muted">{description}</p> : null}
          </div>
          <button
            className="group -mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-app-ink/5"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close modal"
          >
            <X size={20} className="text-app-muted transition-colors group-hover:text-app-ink" />
          </button>
        </div>
        {children}
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
      <span className="mb-2 block text-sm font-medium text-app-ink">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
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
      <span className="mb-2 block text-sm font-medium text-app-ink">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
      />
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold', meta.className)}>
      <Icon size={14} />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: number }) {
  const meta = getPriorityMeta(priority);
  return (
    <span className={clsx('inline-flex rounded-full px-3 py-1.5 text-xs font-semibold', meta.className)}>
      {meta.label}
    </span>
  );
}

export function LoadingPane({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-app-accent/15 border-t-app-accent" />
      <div>
        <h2 className="text-xl font-semibold text-app-ink">{title}</h2>
        <p className="mt-2 text-sm text-app-muted">{message}</p>
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
    error: 'border-app-danger/15 bg-app-danger/10 text-app-danger',
    success: 'border-app-success/15 bg-app-success/10 text-app-success',
    info: 'border-app-accent-2/15 bg-app-accent-2-soft text-app-accent-2',
  };

  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;

  return (
    <div className={clsx('flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm', styles[tone])}>
      <Icon size={16} />
      {message}
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
        className: 'bg-app-success/12 text-app-success',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In progress',
        icon: Clock,
        className: 'bg-app-accent-2-soft text-app-accent-2',
      };
    default:
      return {
        label: 'To do',
        icon: Circle,
        className: 'bg-app-neutral/15 text-app-neutral',
      };
  }
}

function getPriorityMeta(priority: number) {
  if (priority === 1) {
    return { label: 'Urgent', className: 'bg-app-danger/12 text-app-danger' };
  }
  if (priority === 2) {
    return { label: 'High', className: 'bg-app-accent/12 text-app-accent' };
  }
  if (priority === 3) {
    return { label: 'Medium', className: 'bg-app-warning/14 text-app-warning' };
  }
  return { label: 'Low', className: 'bg-app-neutral/12 text-app-neutral' };
}
