import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Plus,
  Search,
  ChevronDown,
  Hash,
  X,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Create Project Modal ────────────────────────────────────────────────────

interface CreateProjectModalProps {
  onClose: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose }) => {
  const { projectApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => projectApi.createProject(name.trim(), description.trim() || undefined),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      onClose();
      navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-[15px] tracking-tight">Create Project</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Project Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Q3 Product Launch"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-[14px] text-white font-medium focus:outline-none focus:border-focus-blue/40 placeholder:text-white/10 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Description <span className="normal-case opacity-50">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-[14px] text-white font-medium focus:outline-none focus:border-focus-blue/40 placeholder:text-white/10 transition-all resize-none"
            />
          </div>
          {mutation.isError && (
            <p className="text-red-400 text-xs font-bold">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-white/10 rounded-xl text-white/40 hover:text-white font-bold text-[13px] transition-all hover:bg-white/5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !name.trim()}
              className="flex-1 py-3 bg-focus-blue text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-focus-blue/90 transition-all disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export const Sidebar: React.FC = () => {
  const { projectApi } = useApi();
  const { logout, user } = useAuth();
  const location = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);

  const {
    data: projectsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['projects'],
    queryFn: ({ pageParam }) => projectApi.getProjects(5, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
    maxPages: 1,
  });

  const allProjects = useMemo(() =>
    projectsData?.pages.flatMap(page => page.projects) || [],
    [projectsData]
  );

  const parentRef = useRef<HTMLElement>(null);

  return (
    <>
      <aside className="w-72 h-screen glass-dark text-white flex flex-col overflow-hidden shrink-0 select-none m-3 mr-0 rounded-[28px]">
        {/* Workspace Header */}
        <div className="p-5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.04] transition-colors border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-focus-blue to-blue-400 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-focus-blue/30">
              T
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-tight leading-none mb-0.5">Taskinator Workspace</span>
              <span className="text-[10px] font-medium text-white/35 uppercase tracking-[0.28em] leading-none">Pro Edition</span>
            </div>
          </div>
          <ChevronDown size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
        </div>

        {/* Global Actions */}
        <div className="px-3 pt-4 space-y-1">
          <button
            onClick={() => {
              // ⌘K shortcut hint only — real Search could be wired in future
              const input = document.querySelector('input[type="search"]') as HTMLInputElement;
              if (input) input.focus();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-white/55 hover:text-white/80 hover:bg-white/[0.05] rounded-xl transition-all text-xs font-medium group border border-transparent hover:border-white/8"
            title="Search (coming soon)"
          >
            <div className="flex items-center gap-2.5">
              <Search size={14} />
              <span>Search</span>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold">⌘</span>
              <span className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold">K</span>
            </div>
          </button>
          <button
            onClick={() => setShowCreateProject(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-white/55 hover:text-white/80 hover:bg-white/[0.05] rounded-xl transition-all text-xs font-medium border border-transparent hover:border-white/8"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>

        {/* Navigation */}
        <nav
          ref={parentRef}
          className="flex-1 px-3 pt-6 space-y-1 overflow-y-auto custom-scrollbar"
        >
          <div className="mb-1">
            <SidebarItem to="/" icon={<LayoutDashboard size={14} />} label="Dashboard" active={location.pathname === '/'} />
          </div>

          <div className="px-3 pt-8 pb-2 flex items-center justify-between group">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Workspace</span>
            <button
              onClick={() => setShowCreateProject(true)}
              className="text-white/0 group-hover:text-white/20 cursor-pointer hover:text-white/60 transition-all p-0.5 rounded"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
            {allProjects.map((p) => (
              <SidebarItem
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                label={p.name}
                icon={<Hash size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />}
                active={location.pathname.startsWith(`/projects/${p.id}`)}
              />
            ))}

            {allProjects.length === 0 && !isFetchingNextPage && (
              <div className="px-3 py-3 text-[11px] text-white/15 font-medium italic">
                No projects found.
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
             <button
              onClick={() => { /* Prev not implemented in sidebar query yet */ }}
              disabled={true}
              className="flex-1 py-1 px-3 rounded-lg bg-white/5 border border-white/10 text-white/10 disabled:opacity-5 flex items-center justify-center transition-all"
              title="Previous Projects"
            >
              <ChevronLeft size={16} className="text-white" />
            </button>
            <button
              onClick={() => fetchNextPage()}
              disabled={!hasNextPage || isFetchingNextPage}
              className="flex-1 py-1 px-3 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/90 hover:bg-white/10 transition-all disabled:opacity-10 flex items-center justify-center transition-all"
              title="Next Projects"
            >
              {isFetchingNextPage ? <Loader2 size={16} className="animate-spin text-focus-blue" /> : <ChevronRight size={16} className="text-white" />}
            </button>
          </div>

          {allProjects.length === 0 && !isFetchingNextPage && (
            <div className="px-3 py-3">
              <p className="text-[11px] text-white/15 font-medium">No projects yet.</p>
            </div>
          )}
        </nav>

        {/* User Footer Section */}
        <div className="mt-auto p-3 border-t border-white/8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl transition-colors group cursor-default border border-white/6">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-focus-blue/20 to-sky-200/10 border border-white/8 flex items-center justify-center text-focus-blue overflow-hidden shadow-inner">
                <User size={18} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white/80 leading-none mb-1 truncate">{user?.username || 'Administrator'}</p>
                <p className="text-[10px] font-medium text-white/20 truncate tracking-wide">{user?.email || ''}</p>
              </div>
              <Settings size={14} className="text-white/10 group-hover:text-white/40 cursor-pointer transition-colors" />
            </div>

            <button
              onClick={() => logout()}
              className="w-full mt-1 px-3 py-2.5 flex items-center gap-2.5 text-[11px] font-bold text-red-500/60 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all duration-300 group"
            >
              <div className="w-6 h-6 rounded-md bg-red-400/0 group-hover:bg-red-500/10 flex items-center justify-center transition-all">
                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="uppercase tracking-widest">Terminate Session</span>
            </button>
          </div>
        </div>
      </aside>

      {showCreateProject && <CreateProjectModal onClose={() => setShowCreateProject(false)} />}
    </>
  );
};

const SidebarItem: React.FC<{
  to: string;
  icon?: React.ReactNode;
  label: string;
  params?: any;
  active?: boolean;
}> = ({ to, icon, label, params, active }) => (
  <Link
    to={to as any}
    params={params}
    className={`group px-3.5 py-2.5 flex items-center gap-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 border ${active
        ? 'bg-white/[0.08] text-white border-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(35,131,226,0.35)]'
        : 'text-white/45 border-transparent hover:text-white/75 hover:bg-white/[0.04] hover:border-white/8'
      }`}
  >
    {icon && <span className={`shrink-0 ${active ? 'text-focus-blue' : 'opacity-45 group-hover:opacity-75'} transition-opacity`}>{icon}</span>}
    <span className="truncate tracking-tight">{label}</span>
  </Link>
);