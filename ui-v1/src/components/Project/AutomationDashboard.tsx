import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Bolt, Check, Loader2, PencilLine, Plus, ShieldCheck, Trash2, Workflow, X } from 'lucide-react';
import type {
  ActionTemplate,
  AutomationTemplatesCatalog,
  ConditionTemplate,
  CreateTaskAutomationRuleInput,
  TaskAutomationRule,
  TriggerTemplate,
} from '../../api/interfaces/AutomationAPI';
import { useApi } from '../../hooks/useApi';
import {
  AppModal,
  EmptyState,
  InlineMessage,
  LoadingPane,
  SurfaceCard,
  SurfaceCardStrong,
  TextField,
} from '../shared/workspace';
import { AutomationFormRenderer, formatStatusLabel } from './AutomationFormRenderer';

const COMMON_STATUSES = ['TODO', 'IN_PROGRESS', 'READY', 'DONE'];

/** Labels shown in the step indicator of the new/edit rule wizard. */
const WIZARD_STEPS = ['Basics', 'Trigger', 'Condition', 'Action'] as const;

type RuleDraft = {
  name: string;
  isSync: boolean;
  triggerType: string;
  triggerValue: string;
  conditionType: string;
  conditionValue: string;
  actionType: string;
  actionValue: string;
};

type ModalState =
  | { mode: 'create'; rule?: undefined }
  | { mode: 'edit'; rule: TaskAutomationRule }
  | null;

const emptyDraft: RuleDraft = {
  name: '',
  isSync: true,
  triggerType: '',
  triggerValue: '',
  conditionType: '',
  conditionValue: '',
  actionType: '',
  actionValue: '',
};

export default function AutomationDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { automationApi, taskApi } = useApi();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState>(null);
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
  /** Current wizard step: 0=basics, 1=trigger, 2=condition, 3=action */
  const [step, setStep] = useState(0);
  const rulesKey = ['automation-rules', projectId];

  const catalogQuery = useQuery({
    queryKey: ['automation-catalog', projectId],
    queryFn: () => automationApi.getTemplatesCatalog(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 30,
  });

  const rulesQuery = useQuery({
    queryKey: rulesKey,
    queryFn: () => automationApi.getRules(projectId!),
    enabled: !!projectId,
  });

  const tasksQuery = useQuery({
    queryKey: ['automation-project-statuses', projectId],
    queryFn: () => taskApi.getTasks(projectId!, { first: 50 }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
  });

  const projectStatuses = useMemo(() => {
    const statuses = new Set(COMMON_STATUSES);
    for (const task of tasksQuery.data?.tasks ?? []) statuses.add(task.status);
    return Array.from(statuses);
  }, [tasksQuery.data?.tasks]);

  const catalog = catalogQuery.data;
  const rules = rulesQuery.data ?? [];
  const syncRules = rules.filter((rule) => rule.isSync);
  const asyncRules = rules.filter((rule) => !rule.isSync);

  const triggerTemplate = catalog?.triggers.find((entry) => entry.type === draft.triggerType);
  const conditionTemplate = catalog?.conditions.find((entry) => entry.type === draft.conditionType);
  const actionTemplate = catalog?.actions.find((entry) => entry.type === draft.actionType);

  /**
   * Filter conditions and actions to only those compatible with the selected trigger.
   * Derived from the server-returned compatibleConditions / compatibleActions lists
   * on TriggerTemplate — no frontend hardcoding required.
   * Falls back to the full catalog when no trigger is selected yet.
   */
  const filteredConditions = catalog
    ? triggerTemplate
      ? catalog.conditions.filter((c) => triggerTemplate.compatibleConditions.includes(c.type))
      : catalog.conditions
    : [];

  const filteredActions = catalog
    ? triggerTemplate
      ? catalog.actions.filter((a) => triggerTemplate.compatibleActions.includes(a.type))
      : catalog.actions
    : [];

  const createRule = useMutation({
    mutationFn: () => automationApi.createRule(buildCreateInput(projectId!, draft)),
    onSuccess: (created) => {
      queryClient.setQueryData<TaskAutomationRule[]>(rulesKey, (current = []) => [created, ...current]);
      closeModal();
    },
  });

  const updateRule = useMutation({
    mutationFn: () => {
      if (modal?.mode !== 'edit') throw new Error('No rule selected');
      return automationApi.updateRule({
        id: modal.rule.id,
        projectId: modal.rule.projectId,
        version: modal.rule.version,
        name: draft.name.trim(),
        isSync: draft.isSync,
        triggerType: draft.triggerType,
        triggerValue: draft.triggerValue || null,
        conditionType: draft.conditionType,
        conditionValue: draft.conditionValue || null,
        actionType: draft.actionType,
        actionValue: draft.actionValue || null,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<TaskAutomationRule[]>(rulesKey, (current = []) =>
        current.map((rule) => (rule.id === updated.id ? updated : rule))
      );
      closeModal();
    },
  });

  const toggleRule = useMutation({
    mutationFn: (rule: TaskAutomationRule) =>
      automationApi.updateRule({
        id: rule.id,
        projectId: rule.projectId,
        version: rule.version,
        isActive: !rule.isActive,
      }),
    onMutate: async (rule) => {
      await queryClient.cancelQueries({ queryKey: rulesKey });
      const previous = queryClient.getQueryData<TaskAutomationRule[]>(rulesKey);
      queryClient.setQueryData<TaskAutomationRule[]>(rulesKey, (current = []) =>
        current.map((entry) => (entry.id === rule.id ? { ...entry, isActive: !entry.isActive } : entry))
      );
      return { previous };
    },
    onError: (_error, _rule, context) => {
      if (context?.previous) queryClient.setQueryData(rulesKey, context.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<TaskAutomationRule[]>(rulesKey, (current = []) =>
        current.map((rule) => (rule.id === updated.id ? updated : rule))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (rule: TaskAutomationRule) => automationApi.deleteRule(rule.projectId, rule.id),
    onMutate: async (rule) => {
      await queryClient.cancelQueries({ queryKey: rulesKey });
      const previous = queryClient.getQueryData<TaskAutomationRule[]>(rulesKey);
      queryClient.setQueryData<TaskAutomationRule[]>(rulesKey, (current = []) =>
        current.filter((entry) => entry.id !== rule.id)
      );
      return { previous };
    },
    onError: (_error, _rule, context) => {
      if (context?.previous) queryClient.setQueryData(rulesKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey });
    },
  });

  const openCreate = () => {
    const next = withCatalogDefaults(emptyDraft, catalog);
    setDraft(next);
    setStep(0);
    setModal({ mode: 'create' });
  };

  const openEdit = (rule: TaskAutomationRule) => {
    setDraft({
      name: rule.name,
      isSync: rule.isSync,
      triggerType: rule.triggerType,
      triggerValue: rule.triggerValue ?? '',
      conditionType: rule.conditionType,
      conditionValue: rule.conditionValue ?? '',
      actionType: rule.actionType,
      actionValue: rule.actionValue ?? '',
    });
    setStep(0);
    setModal({ mode: 'edit', rule });
  };

  const closeModal = () => {
    setModal(null);
    setDraft(emptyDraft);
    setStep(0);
  };

  const saveDisabled =
    !draft.name.trim() ||
    !draft.triggerType ||
    !draft.conditionType ||
    !draft.actionType ||
    (needsSelectValue(triggerTemplate) && !draft.triggerValue) ||
    (needsSelectValue(actionTemplate) && !draft.actionValue);

  if (catalogQuery.isLoading || rulesQuery.isLoading) {
    return (
      <div className="page-frame">
        <LoadingPane title="Loading automations" message="Fetching rule catalog and project rules." />
      </div>
    );
  }

  if (catalogQuery.isError || rulesQuery.isError || !catalog) {
    return (
      <div className="page-frame">
        <EmptyState
          icon={Workflow}
          title="Automations unavailable"
          description={(catalogQuery.error as Error | undefined)?.message || (rulesQuery.error as Error | undefined)?.message || 'Automation data could not be loaded.'}
        />
      </div>
    );
  }

  return (
    <div className="page-frame">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-2">Automation rules</p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-app-ink">Project automation</h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
        >
          <Plus size={16} />
          New rule
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RuleSection
          title="Sync rules"
          icon={ShieldCheck}
          rules={syncRules}
          catalog={catalog}
          emptyTitle="No sync rules"
          emptyDescription="Create a sync rule to run blocking logic or validation guards."
          onToggle={(rule) => toggleRule.mutate(rule)}
          onEdit={openEdit}
          onDelete={(rule) => deleteRule.mutate(rule)}
        />
        <RuleSection
          title="Async rules"
          icon={Bolt}
          rules={asyncRules}
          catalog={catalog}
          emptyTitle="No async rules"
          emptyDescription="Create an async rule to trigger background cascades or side effects."
          onToggle={(rule) => toggleRule.mutate(rule)}
          onEdit={openEdit}
          onDelete={(rule) => deleteRule.mutate(rule)}
        />
      </div>

      <AppModal
        open={!!modal}
        title={modal?.mode === 'edit' ? 'Edit rule' : 'New rule'}
        onClose={closeModal}
        size="md"
      >
        {/* Step indicator */}
        <div className="mb-5 flex items-center gap-1.5">
          {WIZARD_STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition ${
                  i < step
                    ? 'bg-app-success text-white'
                    : i === step
                    ? 'bg-app-accent text-white'
                    : 'bg-app-ink/8 text-app-muted'
                }`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-xs font-semibold ${
                i === step ? 'text-app-ink' : 'text-app-muted'
              }`}>{label}</span>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`h-px w-4 rounded ${
                  i < step ? 'bg-app-success' : 'bg-app-line'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Completed-steps recap — visible on steps 1 through 3 */}
        {step > 0 && (
          <SoFarSummary
            step={step}
            draft={draft}
            triggerTemplate={triggerTemplate}
            conditionTemplate={conditionTemplate}
          />
        )}

        {(createRule.error || updateRule.error) ? (
          <div className="mb-4">
            <InlineMessage tone="error" message={(createRule.error || updateRule.error as Error).message} />
          </div>
        ) : null}

        {/* Step 0 — Basics */}
        {step === 0 && (
          <div className="space-y-4">
            <TextField
              label="Rule name"
              value={draft.name}
              onChange={(name) => setDraft((c) => ({ ...c, name }))}
              placeholder="e.g. Block incomplete tasks"
              required
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-app-ink">Mode</span>
              <select
                value={draft.isSync ? 'sync' : 'async'}
                onChange={(e) => setDraft((c) => ({ ...c, isSync: e.target.value === 'sync' }))}
                className="w-full rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
              >
                <option value="sync">Sync — blocks the action immediately</option>
                <option value="async">Async — runs in the background</option>
              </select>
            </label>
          </div>
        )}

        {/* Step 1 — Trigger */}
        {step === 1 && (
          <div className="space-y-3">
            <TemplatePicker
              label="When"
              value={draft.triggerType}
              options={catalog.triggers}
              onChange={(triggerType) => {
                const newTrigger = catalog.triggers.find((t) => t.type === triggerType);
                const compatConditions = newTrigger?.compatibleConditions ?? [];
                const compatActions = newTrigger?.compatibleActions ?? [];

                // Auto-select the condition if only one is compatible; otherwise reset.
                const nextCondition = compatConditions.includes(draft.conditionType)
                  ? draft.conditionType
                  : compatConditions.length === 1
                  ? compatConditions[0]
                  : '';

                // Auto-select the action if only one is compatible; otherwise reset.
                const nextAction = compatActions.includes(draft.actionType)
                  ? draft.actionType
                  : compatActions.length === 1
                  ? compatActions[0]
                  : '';

                setDraft((c) => ({
                  ...c,
                  triggerType,
                  triggerValue: '',
                  conditionType: nextCondition,
                  conditionValue: nextCondition !== draft.conditionType ? '' : c.conditionValue,
                  actionType: nextAction,
                  actionValue: nextAction !== draft.actionType ? '' : c.actionValue,
                }));
              }}
            />
            {triggerTemplate && (
              <p className="text-xs text-app-muted font-medium px-1">{triggerTemplate.description}</p>
            )}
            {triggerTemplate && (
              <AutomationFormRenderer
                template={triggerTemplate.valueTemplate}
                value={draft.triggerValue}
                onChange={(triggerValue) => setDraft((c) => ({ ...c, triggerValue }))}
                projectStatuses={projectStatuses}
                projectId={projectId}
              />
            )}
          </div>
        )}

        {/* Step 2 — Condition */}
        {step === 2 && (
          <div className="space-y-3">
            <TemplatePicker
              label="If"
              value={draft.conditionType}
              options={filteredConditions}
              onChange={(conditionType) => setDraft((c) => ({ ...c, conditionType, conditionValue: '' }))}
            />
            {/* Hint when the trigger pre-selected the only compatible condition */}
            {filteredConditions.length === 1 && (
              <p className="text-xs font-semibold text-app-accent px-1">
                ✓ Only compatible condition for this trigger — pre-selected
              </p>
            )}
            {conditionTemplate && (
              <p className="text-xs text-app-muted font-medium px-1">{conditionTemplate.description}</p>
            )}
            {conditionTemplate && (
              <AutomationFormRenderer
                template={conditionTemplate.valueTemplate}
                value={draft.conditionValue}
                onChange={(conditionValue) => setDraft((c) => ({ ...c, conditionValue }))}
                projectStatuses={projectStatuses}
                projectId={projectId}
                includeSpecialAssignees={false}
              />
            )}
          </div>
        )}

        {/* Step 3 — Action */}
        {step === 3 && (
          <div className="space-y-3">
            <TemplatePicker
              label="Then"
              value={draft.actionType}
              options={filteredActions}
              onChange={(actionType) => setDraft((c) => ({ ...c, actionType, actionValue: '' }))}
            />
            {/* Hint when the trigger pre-selected the only compatible action */}
            {filteredActions.length === 1 && (
              <p className="text-xs font-semibold text-app-accent px-1">
                ✓ Only compatible action for this trigger — pre-selected
              </p>
            )}
            {actionTemplate && (
              <p className="text-xs text-app-muted font-medium px-1">{actionTemplate.description}</p>
            )}
            {actionTemplate && (
              <AutomationFormRenderer
                template={actionTemplate.valueTemplate}
                value={draft.actionValue}
                onChange={(actionValue) => setDraft((c) => ({ ...c, actionValue }))}
                projectStatuses={projectStatuses}
                projectId={projectId}
                includeSpecialAssignees={actionTemplate.type === 'SET_ASSIGNEE'}
              />
            )}
          </div>
        )}

        {/* Wizard navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={step === 0 ? closeModal : () => setStep((s) => s - 1)}
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2.5 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            {step === 0 ? <><X size={14} /> Cancel</> : <><ArrowLeft size={14} /> Back</>}
          </button>

          {step < 3 ? (
            <button
              type="button"
              disabled={step === 0 && !draft.name.trim()}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-50"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={saveDisabled || createRule.isPending || updateRule.isPending}
              onClick={() => {
                if (saveDisabled) return;
                if (modal?.mode === 'edit') updateRule.mutate();
                else createRule.mutate();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-50"
            >
              {createRule.isPending || updateRule.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Check size={14} />}
              Save rule
            </button>
          )}
        </div>
      </AppModal>
    </div>
  );
}

function RuleSection({
  title,
  icon: Icon,
  rules,
  catalog,
  emptyTitle,
  emptyDescription,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: typeof ShieldCheck;
  rules: TaskAutomationRule[];
  catalog: AutomationTemplatesCatalog;
  emptyTitle: string;
  emptyDescription: string;
  onToggle: (rule: TaskAutomationRule) => void;
  onEdit: (rule: TaskAutomationRule) => void;
  onDelete: (rule: TaskAutomationRule) => void;
}) {
  return (
    <SurfaceCardStrong className="p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-full bg-app-accent-soft p-3 text-app-accent">
          <Icon size={18} />
        </div>
        <div>
          <p className="eyebrow">{rules.length} rules</p>
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">{title}</h3>
        </div>
      </div>
      {rules.length === 0 ? (
        <EmptyState icon={Workflow} title={emptyTitle} description={emptyDescription} className="shadow-none" />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              catalog={catalog}
              onToggle={() => onToggle(rule)}
              onEdit={() => onEdit(rule)}
              onDelete={() => onDelete(rule)}
            />
          ))}
        </div>
      )}
    </SurfaceCardStrong>
  );
}

function RuleCard({
  rule,
  catalog,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: TaskAutomationRule;
  catalog: AutomationTemplatesCatalog;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const trigger = catalog.triggers.find((entry) => entry.type === rule.triggerType);
  const condition = catalog.conditions.find((entry) => entry.type === rule.conditionType);
  const action = catalog.actions.find((entry) => entry.type === rule.actionType);

  return (
    <SurfaceCard className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold text-app-ink">{rule.name}</h4>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={rule.isActive ? 'rounded-full bg-app-success/10 px-3 py-1 text-app-success' : 'rounded-full bg-app-neutral/12 px-3 py-1 text-app-neutral'}>
                {rule.isActive ? 'On' : 'Off'}
              </span>
              <span className="rounded-full bg-app-ink/8 px-3 py-1 text-app-ink">{rule.isSync ? 'Sync' : 'Async'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`relative h-7 w-12 rounded-full transition ${rule.isActive ? 'bg-app-success' : 'bg-app-neutral/40'}`}
            aria-label={rule.isActive ? 'Disable rule' : 'Enable rule'}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${rule.isActive ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <div className="grid gap-2 text-sm text-app-muted">
          <RuleLine label="When" title={trigger?.label ?? rule.triggerType} value={rule.triggerValue} />
          <RuleLine label="If" title={condition?.label ?? rule.conditionType} value={rule.conditionValue} />
          <RuleLine label="Then" title={action?.label ?? rule.actionType} value={rule.actionValue} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-app-line pt-3">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-3 py-2 text-xs font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            <PencilLine size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-full border border-app-danger/20 bg-app-danger/10 px-3 py-2 text-xs font-semibold text-app-danger transition hover:bg-app-danger/15"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function RuleLine({ label, title, value }: { label: string; title: string; value?: string | null }) {
  return (
    <div className="rounded-2xl bg-white/65 px-3 py-2">
      <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.16em] text-app-muted">{label}</span>
      <span className="font-medium text-app-ink">{title}</span>
      {value ? <span className="ml-2 text-app-muted">{formatRuleValue(value)}</span> : null}
    </div>
  );
}

/**
 * SoFarSummary
 *
 * Compact recap strip shown on wizard steps 1–3.
 * Displays what the user configured in all previously completed steps so they
 * never lose context while moving forward. Each chip is read-only — use the
 * Back button to edit a previous step.
 */
function SoFarSummary({
  step,
  draft,
  triggerTemplate,
  conditionTemplate,
}: {
  step: number;
  draft: RuleDraft;
  triggerTemplate?: TriggerTemplate;
  conditionTemplate?: ConditionTemplate;
}) {
  const items: { label: string; value: string }[] = [];

  // Step 0 — Basics (always completed once we reach step ≥ 1)
  if (step >= 1 && draft.name) {
    items.push({
      label: 'Rule',
      value: `${draft.name} · ${draft.isSync ? 'Sync' : 'Async'}`,
    });
  }

  // Step 1 — Trigger (completed once we reach step ≥ 2)
  if (step >= 2 && triggerTemplate) {
    const triggerSuffix = draft.triggerValue ? ` · ${formatRuleValue(draft.triggerValue)}` : '';
    items.push({ label: 'When', value: `${triggerTemplate.label}${triggerSuffix}` });
  }

  // Step 2 — Condition (completed once we reach step ≥ 3)
  if (step >= 3 && conditionTemplate) {
    const condSuffix = draft.conditionValue ? ` · ${formatRuleValue(draft.conditionValue)}` : '';
    items.push({ label: 'If', value: `${conditionTemplate.label}${condSuffix}` });
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-1.5 rounded-2xl border border-app-line/60 bg-app-surface/50 p-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2 text-xs">
          <span className="w-8 shrink-0 font-bold uppercase tracking-[0.12em] text-app-muted">
            {item.label}
          </span>
          <span className="font-medium text-app-ink leading-snug">{item.value}</span>
        </div>
      ))}
    </div>
  );
}


function TemplatePicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<TriggerTemplate | ConditionTemplate | ActionTemplate>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-app-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.type} value={option.type}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Populates default values when opening the "new rule" wizard.
 * Picks the first trigger from the catalog, then selects the first
 * compatible condition and action for that trigger so the user lands
 * in a valid initial state without having to touch every step.
 */
function withCatalogDefaults(draft: RuleDraft, catalog?: AutomationTemplatesCatalog): RuleDraft {
  if (!catalog) return draft;
  const defaultTrigger = catalog.triggers[0];
  const compatConditions = defaultTrigger?.compatibleConditions ?? [];
  const compatActions = defaultTrigger?.compatibleActions ?? [];
  return {
    ...draft,
    triggerType: defaultTrigger?.type ?? '',
    conditionType: catalog.conditions.find((c) => compatConditions.includes(c.type))?.type ?? '',
    actionType: catalog.actions.find((a) => compatActions.includes(a.type))?.type ?? '',
  };
}

function needsSelectValue(template?: TriggerTemplate | ActionTemplate) {
  return template?.valueTemplate.inputType === 'SELECT';
}

function buildCreateInput(projectId: string, draft: RuleDraft): CreateTaskAutomationRuleInput {
  return {
    projectId,
    name: draft.name.trim(),
    isActive: true,
    isSync: draft.isSync,
    triggerType: draft.triggerType,
    triggerValue: draft.triggerValue || null,
    conditionType: draft.conditionType,
    conditionValue: draft.conditionValue || null,
    actionType: draft.actionType,
    actionValue: draft.actionValue || null,
  };
}

export function formatRuleValue(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      const parts: string[] = [];
      if (parsed.from) {
        parts.push(`from ${formatStatusLabel(parsed.from)}`);
      }
      if (parsed.to) {
        parts.push(`to ${formatStatusLabel(parsed.to)}`);
      }
      if (parts.length === 0) {
        return 'any status change';
      }
      return parts.join(' ');
    } catch (e) {
      return value;
    }
  }
  return formatStatusLabel(value);
}
