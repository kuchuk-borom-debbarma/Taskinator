import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Zap, Plus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { AutopilotList } from './AutopilotList';
import { ZapEmptyState } from './ZapEmptyState';
import type { AutopilotItem } from '../../api/interfaces/AutopilotAPI';

// ─── Skeleton ────────────────────────────────────────────────────────────────

const AutopilotCardSkeleton: React.FC = () => (
  <div className="surface-card animate-pulse rounded-[20px] p-5">
    <div className="mb-4 flex items-center gap-2.5">
      <div className="h-2.5 w-2.5 rounded-full bg-app-line/60" />
      <div className="h-4 w-36 rounded-md bg-app-line/50" />
    </div>
    <div className="mb-3 flex gap-2">
      <div className="h-5 w-24 rounded-full bg-app-line/40" />
      <div className="h-5 w-20 rounded-full bg-app-line/30" />
    </div>
    <div className="mb-4 h-8 rounded-lg bg-app-line/30" />
    <div className="flex justify-between">
      <div className="h-3 w-16 rounded bg-app-line/30" />
      <div className="h-3 w-20 rounded bg-app-line/30" />
    </div>
  </div>
);

// ─── Page Component ───────────────────────────────────────────────────────────

export const AutopilotDashboardView: React.FC = () => {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId' });
  const { autopilotApi } = useApi();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['project-autopilots', projectId],
    queryFn: () => autopilotApi.getProjectAutopilots(projectId, { first: 30 }),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  const autopilots = data?.autopilots ?? [];
  const totalCount = data?.totalCount ?? 0;

  return (
    <div className="page-frame">
      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">Automation</div>
          <h1 className="text-2xl font-semibold tracking-tight text-app-ink">Autopilot</h1>
          {!isLoading && totalCount > 0 && (
            <p className="mt-1 text-sm text-app-muted">
              {totalCount} automation{totalCount !== 1 ? 's' : ''} configured
            </p>
          )}
        </div>

        <button
          disabled
          className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-app-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Coming in Phase 11"
        >
          <Plus size={16} />
          New Autopilot
        </button>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AutopilotCardSkeleton />
          <AutopilotCardSkeleton />
          <AutopilotCardSkeleton />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Zap size={32} className="mb-3 text-app-danger" />
          <p className="text-sm font-semibold text-app-danger">Failed to load autopilots</p>
          <p className="mt-1 text-xs text-app-muted">Check your connection and try again.</p>
        </div>
      ) : autopilots.length === 0 ? (
        <ZapEmptyState />
      ) : (
        <AutopilotList autopilots={autopilots} />
      )}
    </div>
  );
};
