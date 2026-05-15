import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Sparkles } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { AutopilotList } from './AutopilotList';
import { ZapEmptyState } from './ZapEmptyState';
import { CreateAutopilotModal } from './CreateAutopilotModal';
import type { CreateAutopilotInput, AutopilotPage } from '../../api/interfaces/AutopilotAPI';

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const AutopilotCardSkeleton: React.FC = () => (
  <div className="surface-card animate-pulse rounded-[20px] p-5 border border-app-line/40 bg-white/40">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-app-line/50" />
        <div className="h-4 w-28 rounded-md bg-app-line/40" />
      </div>
      <div className="h-5 w-9 rounded-full bg-app-line/30" />
    </div>
    <div className="mb-3 flex gap-1.5">
      <div className="h-5 w-20 rounded-full bg-app-line/30" />
      <div className="h-5 w-24 rounded-full bg-app-line/20" />
    </div>
    <div className="mb-5 h-8 rounded-xl bg-app-line/20 w-3/4" />
    <div className="flex justify-between border-t border-app-line/30 pt-3 mt-auto">
      <div className="h-3 w-14 rounded bg-app-line/20" />
      <div className="flex gap-1">
        <div className="h-5 w-16 rounded-full bg-app-line/20" />
        <div className="h-5 w-16 rounded-full bg-app-line/20" />
      </div>
    </div>
  </div>
);

// ─── Header Animation Variants ────────────────────────────────────────────────

const headerVariants = {
  hidden: { opacity: 0, y: -15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 120,
    },
  },
};

// ─── Main Dashboard Component ────────────────────────────────────────────────

export const AutopilotDashboardView: React.FC = () => {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId' });
  const { autopilotApi } = useApi();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const queryKey = ['project-autopilots', projectId];

  // 1. Query: Fetch list of Autopilots
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => autopilotApi.getProjectAutopilots(projectId, { first: 30 }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const autopilots = data?.autopilots ?? [];
  const totalCount = data?.totalCount ?? 0;

  // 2. Mutation: Toggle active state (Optimistic Updates)
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      autopilotApi.toggleAutopilot(id, isActive),
    onMutate: async ({ id, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AutopilotPage>(queryKey);

      // Optimistically update
      queryClient.setQueryData<AutopilotPage>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          autopilots: old.autopilots.map((ap) =>
            ap.id === id ? { ...ap, isActive } : ap,
          ),
        };
      });

      return { previousData };
    },
    onError: (err, _vars, context) => {
      // Rollback to snapshotted value
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error('Autopilot toggle failed:', err);
    },
    onSettled: () => {
      // Sync with server data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive });
  };

  // 3. Mutation: Create new autopilot
  const createMutation = useMutation({
    mutationFn: (input: CreateAutopilotInput) => autopilotApi.createAutopilot(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleSaveAutopilot = async (input: CreateAutopilotInput) => {
    await createMutation.mutateAsync(input);
  };

  return (
    <div className="page-frame min-h-[85vh] flex flex-col">
      {/* ── Create Autopilot Wizard Modal ── */}
      <CreateAutopilotModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        onSave={handleSaveAutopilot}
      />

      {/* ── Header ── */}
      <motion.div
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-app-line/40 pb-6"
      >
        <div>
          <div className="eyebrow mb-1 flex items-center gap-1 text-app-accent">
            <Sparkles size={11} className="fill-app-accent" />
            Workflow Automation
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-app-ink sm:text-3xl">Autopilot</h1>
          <AnimatePresence mode="wait">
            {!isLoading && totalCount > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-1.5 text-sm text-app-muted"
              >
                {totalCount} active automated step{totalCount !== 1 ? 's' : ''} configured in your system.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-app-accent/90 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-app-accent/30"
        >
          <Plus size={16} />
          New Autopilot
        </button>
      </motion.div>

      {/* ── Main Content Area ── */}
      <div className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AutopilotCardSkeleton />
            <AutopilotCardSkeleton />
            <AutopilotCardSkeleton />
          </div>
        ) : isError ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center bg-app-danger/5 border border-dashed border-app-danger/20 rounded-[24px]"
          >
            <div className="h-14 w-14 rounded-full bg-app-danger/10 flex items-center justify-center mb-4 text-app-danger">
              <Zap size={28} />
            </div>
            <h3 className="text-base font-semibold text-app-danger">Failed to Synchronize Autopilots</h3>
            <p className="mt-1.5 text-sm text-app-muted max-w-xs mx-auto">
              There was a communication breakdown with the server. Please check your active sessions and reload.
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey })}
              className="mt-5 rounded-full border border-app-danger/20 bg-white px-5 py-2 text-xs font-semibold text-app-danger hover:bg-app-danger/5 transition"
            >
              Retry Connection
            </button>
          </motion.div>
        ) : autopilots.length === 0 ? (
          <ZapEmptyState />
        ) : (
          <AutopilotList
            autopilots={autopilots}
            onToggle={handleToggleActive}
          />
        )}
      </div>
    </div>
  );
};
