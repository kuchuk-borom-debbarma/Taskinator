import React, { useState, useEffect, useMemo } from 'react';
import { Zap, GitBranch, FileText, ArrowLeft, PlusCircle, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppModal } from '../shared/workspace';
import { PipelineEditor } from './Pipeline/PipelineEditor';
import { useGraphQLClient } from '../../hooks/useGraphQLClient';
import { graphql } from '../../gql';
import { AutoActionTriggerProvider, useAutoActionTrigger } from './AutoActionTriggerContext';
import { AutoActionMetadataProvider, useAutoActionMetadata } from './AutoActionMetadataContext';
import type { PipelineStep, AutoActionCondition } from '../../gql/graphql';
import { normalizeAction } from './Pipeline/actionTypes';

interface CreateAutoActionModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSave?: () => void;
  autoAction?: any;
}

const STEPS = [
  { id: 'triggers', label: 'Triggers', icon: Zap },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { id: 'review', label: 'Review', icon: FileText },
];

const INITIAL_PIPELINE: PipelineStep[] = [
  {
    __typename: 'AutoActionCondition',
    id: 'initial-cond',
    name: 'Main Filter',
    definition: {
      __typename: 'PredicateNode',
      domain: 'task',
      field: 'status',
      operator: 'eq',
      value: 'TODO',
    } as any,
  },
];

const OPERATOR_MAP: Record<string, string> = {
  '==': 'eq',
  '!=': 'neq',
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte',
};

function normalizeConditionValue(field: string, value: unknown) {
  if (field === 'priority' && value !== '' && value !== null && value !== undefined) {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }
  return value;
}

function toConditionNodeInput(node: any): any {
  if (!node) {
    return {
      predicate: {
        domain: 'task',
        field: 'status',
        operator: 'eq',
        value: 'TODO',
      },
    };
  }

  if (node.__typename === 'AndNode' || node.and) {
    const children = node.children ?? node.and?.children ?? [];
    return { and: { children: children.map(toConditionNodeInput) } };
  }

  if (node.__typename === 'OrNode' || node.or) {
    const children = node.children ?? node.or?.children ?? [];
    return { or: { children: children.map(toConditionNodeInput) } };
  }

  if (node.__typename === 'NotNode' || node.not) {
    const child = node.child ?? node.not?.child;
    return { not: { child: toConditionNodeInput(child) } };
  }

  const predicate = node.predicate ?? node;
  const field = predicate.field ?? 'status';
  return {
    predicate: {
      domain: predicate.domain ?? 'task',
      field,
      operator: OPERATOR_MAP[predicate.operator] ?? predicate.operator ?? 'eq',
      value: normalizeConditionValue(field, predicate.value),
    },
  };
}

// ─── GraphQL Mutation ────────────────────────────────────────────────────────

const CREATE_AUTO_ACTION = graphql(`
  mutation CreateAutoAction($input: CreateAutoActionInput!) {
    createAutoAction(input: $input) {
      id
      isActive
      triggers
      ...AutoActionCardFragment
    }
  }
`);

const UPDATE_AUTO_ACTION = graphql(`
  mutation UpdateAutoAction($id: ID!, $version: Int!, $input: UpdateAutoActionInput!) {
    updateAutoAction(id: $id, version: $version, input: $input) {
      id
      isActive
      triggers
      ...AutoActionCardFragment
    }
  }
`);


export const CreateAutoActionModal: React.FC<CreateAutoActionModalProps> = (props) => {
  return (
    <AutoActionTriggerProvider>
      <AutoActionMetadataProvider>
        <CreateAutoActionModalContent {...props} />
      </AutoActionMetadataProvider>
    </AutoActionTriggerProvider>
  );
};

const CreateAutoActionModalContent: React.FC<CreateAutoActionModalProps> = ({
  open,
  onClose,
  projectId,
  onSave,
  autoAction,
}) => {
  const queryClient = useQueryClient();
  const { request } = useGraphQLClient();
  const { setSelectedEntityType } = useAutoActionTrigger();
  const { template, isLoading: isTemplateLoading } = useAutoActionMetadata();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [triggers, setTriggers] = useState<string[]>([]);
  const [pipeline, setPipeline] = useState<any[]>(INITIAL_PIPELINE);

  const step = STEPS[currentStepIdx]?.id;

  const triggerOptions = useMemo(() => {
    return template?.triggers || [];
  }, [template]);


  useEffect(() => {
    if (open) {
      if (autoAction) {
        setTriggers(autoAction.triggers || []);
        const mappedPipeline = (autoAction.pipeline || []).map((stepItem: any) => {
          if (stepItem.__typename === 'AutoActionAction') {
            return {
              ...stepItem,
              config: stepItem.config || stepItem.params || {},
            };
          }
          return stepItem;
        });
        setPipeline(mappedPipeline);
      } else {
        setTriggers([]);
        setPipeline(INITIAL_PIPELINE);
      }
      setError(null);
      setCurrentStepIdx(0);
    }
  }, [open, autoAction]);

  const mutation = useMutation({
    mutationFn: (input: any) => request(CREATE_AUTO_ACTION, { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-autoActions', projectId] });
      handleClose();
      onSave?.();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create autoAction.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, version, input }: { id: string; version: number; input: any }) => request(UPDATE_AUTO_ACTION, { id, version, input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-autoActions', projectId] });
      handleClose();
      onSave?.();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update autoAction.');
    }
  });

  const handleClose = () => {
    if (mutation.isPending || updateMutation.isPending) return;
    setCurrentStepIdx(0);
    setTriggers([]);
    setPipeline(INITIAL_PIPELINE);
    setError(null);
    onClose();
  };

  const toggleTrigger = (val: string) => {
    setTriggers((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val],
    );
  };

  const handleNext = () => {
    if (step === 'triggers') {
      if (triggers.length === 0) return;
      
      const firstTrigger = triggers[0];
      if (firstTrigger.startsWith('task.')) setSelectedEntityType('task');
      else if (firstTrigger.startsWith('project.')) setSelectedEntityType('project');
      else if (firstTrigger.startsWith('team.')) setSelectedEntityType('team');
    }
    setCurrentStepIdx((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStepIdx((prev) => Math.max(prev - 1, 0));
  };

  const handleCreate = async () => {
    const pipelineInput = pipeline.map(item => {
      if (item.__typename === 'AutoActionAction') {
        const action = normalizeAction(item as any);
        return {
          action: {
            type: action.type,
            params: action.config
          }
        };
      } else {
        const condition = item as AutoActionCondition;
        return {
          condition: {
            name: condition.name || 'Logic Block',
            definition: toConditionNodeInput(condition.definition)
          }
        };
      }
    });

    if (autoAction) {
      updateMutation.mutate({
        id: autoAction.id,
        version: autoAction.version,
        input: {
          triggers,
          pipeline: pipelineInput
        }
      });
    } else {
      mutation.mutate({
        projectId,
        triggers,
        pipeline: pipelineInput
      });
    }
  };

  const submitting = mutation.isPending || updateMutation.isPending;

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title={autoAction ? "Modify AutoAction" : "Build New AutoAction"}
      description={autoAction ? "Modify triggers, condition logic, and sequential actions for this rule." : "Automate your workflows with triggers, condition logic, and sequential actions."}
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
              {isTemplateLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-app-line/20" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3">
                  {triggerOptions.map((opt: any) => {
                    const isSelected = triggers.includes(opt.type);
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => toggleTrigger(opt.type)}
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
                          <p className="text-sm font-semibold text-app-ink">{opt.name}</p>
                          <p className="mt-1 text-xs leading-relaxed text-app-muted">{opt.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {triggers.length === 0 && (
                <p className="text-xs italic text-app-muted text-center mt-3">
                  * Select at least one trigger to continue.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Pipeline */}
          {step === 'pipeline' && (
            <div className="space-y-4 animate-in fade-in duration-200 h-full overflow-y-auto px-1 pr-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted mb-2">
                Build Action Pipeline
              </h4>
              <PipelineEditor
                pipeline={pipeline}
                onChange={setPipeline}
              />
              {pipeline.length === 0 && (
                <p className="text-xs italic text-app-muted text-center mt-2">
                  * AutoActions require at least one step to fire.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Review & Create */}
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
                        {triggerOptions.find((o: any) => o.type === t)?.name || t}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-app-muted tracking-widest block mb-1.5">PIPELINE STEPS ({pipeline.length})</span>
                  <div className="space-y-1.5">
                    {pipeline.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-app-ink bg-white border border-app-line rounded-lg px-3 py-2 shadow-sm">
                        <span className="font-black text-app-accent w-4">{i + 1}</span>
                        {item.__typename === 'AutoActionAction' ? (
                          <>
                            <span className="font-medium capitalize">{(item as any).type.split('.').pop()?.replace('_', ' ')}</span>
                            <span className="ml-auto text-[10px] text-app-muted font-mono truncate max-w-[150px]">
                              {JSON.stringify((item as any).params || (item as any).config)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-app-warning">Logic Block</span>
                            <span className="ml-auto text-[10px] text-app-muted font-mono truncate max-w-[150px]">
                              {JSON.stringify((item as any).definition).substring(0, 30)}...
                            </span>
                          </>
                        )}
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
              disabled={submitting || pipeline.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-app-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >

              {submitting ? (
                autoAction ? <>Saving changes...</> : <>Creating rule...</>
              ) : (
                <>
                  <PlusCircle size={16} />
                  {autoAction ? 'Save Changes' : 'Activate AutoAction'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </AppModal>
  );
};
