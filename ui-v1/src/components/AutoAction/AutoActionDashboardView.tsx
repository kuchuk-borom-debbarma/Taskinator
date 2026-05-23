import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Sparkles, Shield, ToggleLeft, ToggleRight, Settings, Info, Save, Trash2, ArrowRight } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { AppModal, TextField, TextAreaField } from '../shared/workspace';

export const AutoActionDashboardView: React.FC = () => {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId' });
  const { taskApi } = useApi();
  const queryClient = useQueryClient();

  const [configuringRule, setConfiguringRule] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [editingValue, setEditingValue] = useState('');

  const catalogKey = ['cwb-catalog', projectId];
  const rulesKey = ['cwb-rules', projectId];

  // 1. Query: Fetch settings catalog (pre-defined templates)
  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: catalogKey,
    queryFn: () => taskApi.getBehaviorSettingsCatalog(projectId),
    enabled: !!projectId,
  });

  // 2. Query: Fetch active behavior rules in the project
  const { data: activeRules, isLoading: rulesLoading } = useQuery({
    queryKey: rulesKey,
    queryFn: () => taskApi.getBehaviorRules(projectId),
    enabled: !!projectId,
  });

  // 3. Mutation: Create behavior rule
  const createRuleMutation = useMutation({
    mutationFn: (input: any) => taskApi.createBehaviorRule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey });
    },
  });

  // 4. Mutation: Update behavior rule
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, version, input }: { id: string; version: number; input: any }) =>
      taskApi.updateBehaviorRule(id, version, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey });
      setConfiguringRule(null);
    },
  });

  // 5. Mutation: Delete behavior rule
  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => taskApi.deleteBehaviorRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey });
    },
  });

  const isLoading = catalogLoading || rulesLoading;
  const catalog = catalogData?.settings ?? [];
  const rules = activeRules ?? [];

  const handleToggleRule = async (setting: any) => {
    const existingRule = rules.find((r) => r.behaviorType === setting.id);

    if (existingRule) {
      // Toggle Off: Delete the rule
      deleteRuleMutation.mutate(existingRule.id);
    } else {
      // Toggle On: Create default rule
      const input: any = {
        projectId,
        name: setting.name,
        behaviorType: setting.id,
        isActive: true,
      };

      // Set baseline default configurations for specific behavior types
      if (setting.id === 'PARENT_DELETE_GUARD') {
        input.actionMessage = 'Cannot delete parent task while active subtasks exist.';
      } else if (setting.id === 'BLOCKER_SAFETY_GUARD') {
        input.actionMessage = 'Cannot start task while active blocking dependencies exist.';
      } else if (setting.id === 'MEMBER_ASSIGNMENT_GUARD') {
        input.actionMessage = 'Cannot assign a member to this task without a team context.';
      } else if (setting.id === 'BLOCKER_RESOLUTION') {
        input.criteriaField = 'status';
        input.criteriaOperator = 'EQUALS';
        input.criteriaValue = 'DONE';
        input.actionValue = 'READY';
      }

      createRuleMutation.mutate(input);
    }
  };

  const handleOpenConfigurator = (setting: any) => {
    const existingRule = rules.find((r) => r.behaviorType === setting.id);
    if (!existingRule) return;

    setConfiguringRule({
      setting,
      rule: existingRule,
    });
    setEditingMessage(existingRule.actionMessage || '');
    setEditingValue(existingRule.actionValue || '');
  };

  const handleSaveConfig = () => {
    if (!configuringRule) return;
    const { rule } = configuringRule;

    const input: any = {};
    if (rule.behaviorType.includes('GUARD')) {
      input.actionMessage = editingMessage;
    } else {
      input.actionValue = editingValue;
    }

    updateRuleMutation.mutate({
      id: rule.id,
      version: rule.version,
      input,
    });
  };

  const guards = catalog.filter((s) => s.category === 'GUARD');
  const cascades = catalog.filter((s) => s.category === 'CASCADE' || s.category === 'AUTOMATION');

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-accent border-t-transparent" />
        <span className="text-sm font-medium text-app-muted">Loading workspace behaviors...</span>
      </div>
    );
  }

  return (
    <div className="page-frame min-h-[85vh] flex flex-col p-6">
      {/* Header Panel */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-6 border-b border-app-line/40 pb-6">
        <div>
          <div className="eyebrow mb-1 flex items-center gap-1.5 text-app-accent font-semibold uppercase tracking-wider text-xs">
            <Sparkles size={13} className="fill-app-accent" />
            Configurable Workspace Behaviors (CWB)
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-app-ink">Behaviors & Policies</h1>
          <p className="mt-2 text-sm text-app-muted max-w-2xl leading-relaxed">
            Configure safety constraints and relationship cascades for your project tasks. Guards block invalid mutations inside atomic transactions, while cascades trigger side-effects and propagate changes automatically.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Left Column: Guards */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-app-line/30 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Shield size={16} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-app-ink">Pre-Action Guards</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {guards.map((setting) => {
              const activeRule = rules.find((r) => r.behaviorType === setting.id);
              const isActive = !!activeRule;

              return (
                <div
                  key={setting.id}
                  className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
                    isActive
                      ? 'border-amber-500/20 bg-amber-500/[0.02] shadow-sm'
                      : 'border-app-line/40 bg-white/40 hover:border-app-line/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-app-ink">{setting.name}</h3>
                      <p className="text-xs text-app-muted leading-relaxed max-w-sm">
                        {setting.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleRule(setting)}
                      className={`shrink-0 transition duration-200 hover:scale-105 ${
                        isActive ? 'text-amber-500' : 'text-app-muted/60'
                      }`}
                    >
                      {isActive ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                    </button>
                  </div>

                  {isActive && (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-amber-500/10 pt-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
                        <Info size={12} />
                        Active Guard Policy
                      </div>

                      <button
                        onClick={() => handleOpenConfigurator(setting)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-app-accent hover:underline"
                      >
                        <Settings size={11} />
                        Configure Message
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Cascades */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-app-line/30 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-accent/10 text-app-accent">
              <Zap size={16} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-app-ink">Post-Action Cascades</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {cascades.map((setting) => {
              const activeRule = rules.find((r) => r.behaviorType === setting.id);
              const isActive = !!activeRule;

              return (
                <div
                  key={setting.id}
                  className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 ${
                    isActive
                      ? 'border-app-accent/20 bg-app-accent/[0.02] shadow-sm'
                      : 'border-app-line/40 bg-white/40 hover:border-app-line/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-app-ink">{setting.name}</h3>
                      <p className="text-xs text-app-muted leading-relaxed max-w-sm">
                        {setting.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleRule(setting)}
                      className={`shrink-0 transition duration-200 hover:scale-105 ${
                        isActive ? 'text-app-accent' : 'text-app-muted/60'
                      }`}
                    >
                      {isActive ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                    </button>
                  </div>

                  {isActive && (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-app-accent/10 pt-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-app-accent font-medium">
                        <ArrowRight size={12} />
                        Active Cascade Trigger
                      </div>

                      {setting.id === 'BLOCKER_RESOLUTION' && (
                        <button
                          onClick={() => handleOpenConfigurator(setting)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-app-accent hover:underline"
                        >
                          <Settings size={11} />
                          Configure Target Status
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slide-over configuration modal */}
      {configuringRule && (
        <AppModal
          open={!!configuringRule}
          title={`Configure Policy: ${configuringRule.setting.name}`}
          description="Adjust behavior rule settings to match your team workflows."
          onClose={() => setConfiguringRule(null)}
        >
          <div className="space-y-4 pt-2">
            {configuringRule.setting.category === 'GUARD' ? (
              <TextAreaField
                label="Custom Rejection Message"
                description="Shown directly to the user when they perform a mutation that violates this guard constraint."
                value={editingMessage}
                onChange={setEditingMessage}
                rows={3}
              />
            ) : (
              <TextField
                label="Target Status value"
                description="The task status to transition successors to when all blocker tasks are resolved."
                value={editingValue}
                onChange={setEditingValue}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setConfiguringRule(null)}
                className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink hover:border-app-line/80 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={updateRuleMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-app-accent/90"
              >
                {updateRuleMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
};
