import React, { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { LayoutGrid, ArrowRight, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { cursor, direction } = useSearch({ from: '/' });
  const { projectApi } = useApi();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['dashboard-projects', cursor, direction],
    queryFn: ({ pageParam }) => {
      const activeParam = pageParam || (cursor ? { direction: direction || 'forward', cursor } : undefined);
      const isBackward = activeParam?.direction === 'backward';
      const c = activeParam?.cursor;

      return projectApi.getProjects(6, isBackward ? undefined : c, isBackward ? c : undefined);
    },
    initialPageParam: (cursor ? { direction: direction || 'forward', cursor } : undefined) as { direction: 'forward' | 'backward', cursor: string } | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? { direction: 'forward' as const, cursor: lastPage.endCursor! } : undefined,
    getPreviousPageParam: (firstPage) => firstPage.hasPreviousPage ? { direction: 'backward' as const, cursor: firstPage.startCursor! } : undefined,
    maxPages: 1,
  });

  const createMutation = useMutation({
    mutationFn: () => projectApi.createProject(newName.trim(), newDesc.trim() || undefined),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
    },
  });

  const projects = data?.pages.flatMap(p => p.projects) || [];
  const firstPage = data?.pages[0];
  const lastPage = data?.pages[data.pages.length - 1];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-dim">
        <Loader2 className="w-5 h-5 animate-spin text-focus-blue" />
        <span className="text-[13px] font-medium">Loading projects...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-red-600">
        <p className="font-bold">Failed to load projects.</p>
        <p className="text-sm">Please ensure the backend is running and you are signed in.</p>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-focus-blue to-blue-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-focus-blue/20">
              <LayoutGrid size={22} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (firstPage?.hasPreviousPage) {
                  navigate({
                    search: (prev) => ({ 
                      ...prev, 
                      cursor: firstPage.startCursor!, 
                      direction: 'backward' as const 
                    }),
                  });
                }
              }}
              disabled={!firstPage?.hasPreviousPage || isFetchingPreviousPage}
              className="p-2.5 rounded-xl bg-white/70 border border-slate-200 text-text-notion disabled:opacity-20 hover:bg-white transition-all active:scale-95 flex items-center justify-center transition-all shadow-sm"
              title="Previous Page"
            >
              <ChevronLeft size={18} className="text-text-notion" />
            </button>
            <button
              onClick={() => {
                if (lastPage?.hasNextPage) {
                  navigate({
                    search: (prev) => ({ 
                      ...prev, 
                      cursor: lastPage.endCursor!, 
                      direction: 'forward' as const 
                    }),
                  });
                }
              }}
              disabled={!lastPage?.hasNextPage || isFetchingNextPage}
              className="p-2.5 rounded-xl bg-white/70 border border-slate-200 text-text-notion disabled:opacity-20 hover:bg-white transition-all active:scale-95 flex items-center justify-center transition-all shadow-sm"
              title="Next Page"
            >
              <ChevronRight size={18} className="text-text-notion" />
            </button>
            {(isFetchingPreviousPage || isFetchingNextPage) && (
              <Loader2 size={16} className="animate-spin text-focus-blue ml-2" />
            )}
          </div>
        </div>
        
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-focus-blue to-blue-400 text-white rounded-2xl font-bold text-[13px] hover:brightness-105 transition-all shadow-lg shadow-focus-blue/20 active:scale-95"
        >
          <ArrowRight size={15} className="-rotate-45" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div 
            key={p.id}
            onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: p.id } })}
            className="group glass-card p-6 rounded-[24px] hover:shadow-premium hover:-translate-y-0.5 hover:border-focus-blue/30 transition-all cursor-pointer flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-focus-blue transition-colors">{p.name}</h3>
              <p className="text-sm text-text-dim line-clamp-2 mb-6">{p.description || 'No description provided.'}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">
                v{p.version}
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/70 border border-white/70 text-text-dim group-hover:bg-focus-blue group-hover:text-white group-hover:border-focus-blue transition-all">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        ))}

        <div
          onClick={() => setShowCreate(true)}
          className="glass-card p-6 border-2 border-dashed border-slate-200/80 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:border-focus-blue/30 hover:bg-white/75 transition-all cursor-pointer group min-h-[160px]"
        >
          <div className="w-11 h-11 rounded-full bg-white/75 border border-white/70 flex items-center justify-center text-text-dim group-hover:bg-focus-blue group-hover:border-focus-blue group-hover:text-white transition-all">
            <span className="text-xl font-bold leading-none">+</span>
          </div>
          <p className="text-sm font-semibold text-text-notion">New Project</p>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/18 backdrop-blur-md" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md glass-card rounded-[28px] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-text-notion text-base tracking-tight">Create New Project</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl text-text-dim hover:bg-white/70 transition-all"><ArrowRight size={14} className="rotate-45" /></button>
            </div>
            <form
              onSubmit={e => { e.preventDefault(); if (newName.trim()) createMutation.mutate(); }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">Project Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Q3 Product Launch"
                  className="w-full px-4 py-3 bg-white/70 border border-white/70 rounded-2xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/40 focus:bg-white placeholder:text-text-dim/40 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">Description <span className="normal-case font-medium opacity-50">(optional)</span></label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/70 border border-white/70 rounded-2xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/40 focus:bg-white placeholder:text-text-dim/40 transition-all resize-none"
                />
              </div>
              {createMutation.isError && (
                <p className="text-red-500 text-xs font-bold">{(createMutation.error as Error).message}</p>
              )}
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 glass-button rounded-2xl text-text-dim hover:text-text-notion font-bold text-[13px] transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newName.trim()}
                  className="flex-1 py-3 bg-focus-blue text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-focus-blue/90 transition-all disabled:opacity-50 shadow-md shadow-focus-blue/20"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
