import React, { useState } from 'react';
import { Zap, GitBranch, ListChecks, FileText, ArrowLeft, PlusCircle, AlertTriangle } from 'lucide-react';
import { AppModal } from '../shared/workspace';
import { ConditionBuilderCanvas } from './Builder/ConditionBuilderCanvas';
import { ActionPipelineEditor } from './Pipeline/ActionPipelineEditor';
import type { AutopilotConditionNode, AutopilotAction, CreateAutopilotInput } from '../../api/interfaces/AutopilotAPI';

interface CreateAutopilotModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSave: (input: CreateAutopilotInput) => Promise<void>;
}

const STEPS = [
  { id: 'triggers', label: 'Triggers', icon: Zap },
  { id: 'conditions', label: 'Conditions', icon: GitBranch },
  { id: 'actions', label: 'Actions', icon: ListChecks },
  { id: 'review', label: 'Review', icon: FileText },
];

const TRIGGER_OPTIONS = [
  { value: 'task.created', label: 'Task Created', description: 'Fires immediately when a new task is created in the project.' },
  { value: 'task.updated', label: 'Task Updated', description: 'Fires whenever a task title, description or custom attributes change.' },
  { value: 'task.status_changed', label: 'Status Changed', description: 'Fires when a task changes from one lifecycle state to another.' },
  { value: 'task.assigned', label: 'Member Assigned', description: 'Fires when a team member is assigned to a task.' },
];

const INITIAL_CONDITION: AutopilotConditionNode = {
  type: 'predicate',
  domain: 'task',
  field: 'status',
  operator: '==',
  value: 'TODO',
};

export const CreateAutopilotModal: React.FC<CreateAutopilotModalProps> = ({
  open,
  onClose,
  projectId,
  onSave,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [triggers, setTriggers] = useState<string[]>([]);
  const [conditions, setConditions] = useState<AutopilotConditionNode>(INITIAL_CONDITION);
  const [actions, setActions] = useState<AutopilotAction[]>([]);

  const step = STEPS[currentStepIdx]?.id;

  const handleClose = () => {
    if (submitting) return;
    setCurrentStepIdx(0);
    setTriggers([]);
    setConditions(INITIAL_CONDITION);
    setActions([]);
    setError(null);
    onClose();
  };

  const toggleTrigger = (val: string) => {
    setTriggers((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val],
    );
  };

  const handleNext = () => {
    if (step === 'triggers' && triggers.length === 0) return;
    setCurrentStepIdx((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStepIdx((prev) => Math.max(prev - 1, 0));
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateAutopilotInput = {
        projectId,
        triggers,
        conditions,
        actions: actions.map((a) => ({
          type: a.type,
          config: a.config,
          position: a.position,
        })),
      };
      await onSave(input);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create autopilot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Build New Autopilot"
      description="Automate your workflows with triggers, condition logic, and sequential actions."
      size="full"
    >
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between px-1 py-4 border-b border-app-line/60">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = currentStepIdx === idx;
            const isDone = currentStepIdx > idx;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition duration-300 ${
                      isActive
                        ? 'border-app-accent bg-app-accent text-white ring-4 ring-app-accent/15'
                        : isDone
                          ? 'border-app-accent/40 bg-app-accent-soft text-app-accent'
                          : 'border-app-line bg-white text-app-muted'
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <span className={`text-[11px] font-semibold ${isActive ? 'text-app-ink' : 'text-app-muted'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-2 transition-colors duration-300 ${
                      isDone ? 'bg-app-accent/40' : 'bg-app-line/60'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Error Area */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-[12px] border border-app-danger/20 bg-app-danger/5 p-3 text-xs font-medium text-app-danger">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Step Body */}
        <div className="flex-1 flex flex-col py-5 min-h-0 overflow-hidden">
          {/* Step 1: Triggers */}
          {step === 'triggers' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 overflow-y-auto pr-2 h-full">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted">
                Select when this rule should fire
              </h4>
              <div className="grid gap-3">
                {TRIGGER_OPTIONS.map((opt) => {
                  const isSelected = triggers.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTrigger(opt.value)}
                      className={`group flex items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-app-accent bg-app-accent-soft ring-2 ring-app-accent/10'
                          : 'border-app-line bg-white/60 hover:border-app-accent/30 hover:bg-white/90'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          isSelected ? 'border-app-accent bg-app-accent text-white' : 'border-app-line bg-white group-hover:border-app-accent/50'
                        }`}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-app-ink">{opt.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-app-muted">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {triggers.length === 0 && (
                <p className="text-xs italic text-app-muted text-center mt-3">
                  * Select at least one trigger to continue.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Conditions */}
          {step === 'conditions' && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-200 min-h-0 h-full">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted">
                  Define criteria (Filters)
                </h4>
                <span className="text-[11px] font-medium text-app-muted bg-app-ink/5 px-2 py-1 rounded-full">
                  Drag handles to link nodes
                </span>
              </div>
              <div className="flex-1 relative w-full rounded-2xl overflow-hidden min-h-[350px]">
                <ConditionBuilderCanvas
                  initialCondition={conditions}
                  onChange={setConditions}
                />
              </div>
            </div>
          )}

          {/* Step 3: Actions */}
          {step === 'actions' && (
            <div className="space-y-4 animate-in fade-in duration-200 h-full overflow-y-auto px-1 pr-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
                Build Action Pipeline
              </h4>
              <ActionPipelineEditor
                actions={actions}
                onChange={setActions}
              />
              {actions.length === 0 && (
                <p className="text-xs italic text-app-muted text-center mt-2">
                  * Autopilots require at least one action step to fire.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Review & Create */}
          {step === 'review' && (
            <div className="space-y-5 animate-in fade-in duration-200 h-full overflow-y-auto pr-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted">
                Review Rule Configuration
              </h4>

              <div className="rounded-2xl border border-app-line/80 bg-app-ink/[0.02] p-4 space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-app-muted tracking-widest block mb-1.5">WHEN TRIGGERED BY</span>
                  <div className="flex flex-wrap gap-2">
                    {triggers.map((t) => (
                      <span key={t} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white border border-app-line text-app-ink shadow-sm flex items-center gap-1">
                        <Zap size={10} className="text-app-accent fill-app-accent" />
                        {TRIGGER_OPTIONS.find((o) => o.value === t)?.label || t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-app-muted tracking-widest block mb-1.5">IF CONDITIONS MATCH</span>
                  <p className="text-xs font-mono text-app-ink bg-white border border-app-line rounded-xl p-2 truncate">
                    {JSON.stringify(conditions).substring(0, 120)}...
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-app-muted tracking-widest block mb-1.5">THEN RUN ACTIONS ({actions.length})</span>
                  <div className="space-y-1.5">
                    {actions.map((act, i) => (
                      <div key={act.id} className="flex items-center gap-2 text-xs text-app-ink bg-white border border-app-line rounded-lg px-3 py-2 shadow-sm">
                        <span className="font-black text-app-accent w-4">{i + 1}</span>
                        <span className="font-medium capitalize">{act.type.split('.').pop()?.replace('_', ' ')}</span>
                        <span className="ml-auto text-[10px] text-app-muted font-mono truncate max-w-[150px]">
                          {JSON.stringify(act.config)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between border-t border-app-line/60 pt-4 mt-auto bg-white/50">
          {currentStepIdx > 0 ? (
            <button
              onClick={handleBack}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:bg-white disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div /> // spacer
          )}

          {currentStepIdx < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={(step === 'triggers' && triggers.length === 0)}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-app-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={submitting || actions.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-app-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>Creating rule...</>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Activate Autopilot
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </AppModal>
  );
};
