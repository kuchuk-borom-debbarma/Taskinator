import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  LayoutDashboard,
  LogOut,
  User,
  Plus,
  Hash,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';

// ─── Create Project Modal ────────────────────────────────────────────────────

interface CreateProjectModalProps {
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose }) => {
  const { projectApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => projectApi.createProject(name.trim(), description.trim() || undefined),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-projects-list'] });
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
      <div className="absolute inset-0 bg-slate-900/18 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white border border-border-notion rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-text-notion font-bold text-[15px] tracking-tight">Create New Project</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-dim hover:text-text-notion hover:bg-bg-secondary transition-all">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">Project Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Q3 Roadmap"
              className="w-full px-4 py-3 bg-bg-secondary border border-border-notion rounded-xl text-[14px] text-text-notion font-medium focus:outline-none focus:border-focus-blue/40 placeholder:text-text-dim/40 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Strategic goals and objectives..."
              rows={3}
              className="w-full px-4 py-3 bg-bg-secondary border border-border-notion rounded-xl text-[14px] text-text-notion font-medium focus:outline-none focus:border-focus-blue/40 placeholder:text-text-dim/40 transition-all resize-none"
            />
          </div>
          {mutation.isError && (
             <p className="text-red-400 text-[11px] font-bold">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-border-notion rounded-xl text-text-dim hover:text-text-notion font-bold text-[13px] transition-all hover:bg-bg-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !name.trim()}
              className="flex-1 py-3 bg-focus-blue text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-focus-blue/90 transition-all disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {mutation.isPending ? 'Creating...' : 'Launch Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

export const Sidebar: React.FC = () => {
  const { projectApi } = useApi();
  const { logout, user } = useAuth();
  const { isSidebarCollapsed } = useLayout();
  const location = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Pagination State (Persisted)
  const [currentCursor, setCurrentCursor] = React.useState<string | undefined>(() => 
    localStorage.getItem('taskinator_sidebar_cursor') || undefined
  );
  const [cursorHistory, setCursorHistory] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('taskinator_sidebar_history') || '[]');
    } catch {
      return [];
    }
  });

  // Sync state to localStorage
  React.useEffect(() => {
    if (currentCursor) {
      localStorage.setItem('taskinator_sidebar_cursor', currentCursor);
    } else {
      localStorage.removeItem('taskinator_sidebar_cursor');
    }
    localStorage.setItem('taskinator_sidebar_history', JSON.stringify(cursorHistory));
  }, [currentCursor, cursorHistory]);

  const {
    data,
    isLoading,
    isFetching
  } = useQuery({
    queryKey: ['sidebar-projects', currentCursor],
    queryFn: () => projectApi.getProjects(PAGE_SIZE, currentCursor),
  });

  const projects = data?.projects || [];
  const hasNextPage = data?.hasNextPage || false;
  const nextCursor = data?.endCursor;

  const handleNextPage = () => {
    if (nextCursor && hasNextPage) {
      setCursorHistory([...cursorHistory, currentCursor as string]);
      setCurrentCursor(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevHistory = [...cursorHistory];
      const prevCursor = prevHistory.pop();
      setCursorHistory(prevHistory);
      setCurrentCursor(prevCursor);
    }
  };

  return (
    <>
      <aside 
        className={`h-screen glass text-text-notion flex flex-col overflow-hidden shrink-0 select-none m-3 mr-0 rounded-[28px] transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-0 opacity-0 m-0 border-0 shadow-none' : 'w-72 opacity-100'
        }`}
      >
        <div className="w-72 flex flex-col h-full"> {/* Inner wrapper to prevent width collapse issues */}
          {/* Workspace Header */}
          <div className="p-5 flex items-center justify-between group cursor-default border-b border-border-notion">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-focus-blue to-blue-400 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-focus-blue/30">
                T
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight leading-none mb-0.5">Taskinator Workspace</span>
                <span className="text-[10px] font-medium text-text-dim uppercase tracking-[0.28em] leading-none">Management Console</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 pt-8 flex flex-col overflow-hidden">
            <div className="mb-1">
              <SidebarItem 
                to="/" 
                icon={<LayoutDashboard size={14} />} 
                label="Dashboard" 
                active={location.pathname === '/'} 
              />
            </div>

            {/* Project List Section */}
            <div className="mt-8 flex flex-col flex-1 overflow-hidden">
              <div className="px-3 pb-3 flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Projects</h3>
                  <button 
                    onClick={() => setShowCreateProject(true)}
                    className="p-1 rounded-md hover:bg-bg-secondary text-text-dim opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Minimal Pagination Inline */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={handlePrevPage}
                    disabled={cursorHistory.length === 0}
                    className="p-1 rounded-md hover:bg-bg-secondary text-text-dim hover:text-text-notion disabled:opacity-0 transition-all border border-transparent hover:border-border-notion"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage || isFetching}
                    className="p-1 rounded-md hover:bg-bg-secondary text-text-dim hover:text-text-notion disabled:opacity-0 transition-all border border-transparent hover:border-border-notion"
                  >
                    {isFetching ? <Loader2 size={11} className="animate-spin text-focus-blue" /> : <ChevronRight size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden space-y-0.5">
                {isLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-text-dim italic">
                    <Loader2 size={12} className="animate-spin" /> Syncing...
                  </div>
                ) : (
                  projects.map(p => (
                    <SidebarItem 
                      key={p.id} 
                      to="/projects/$projectId" 
                      params={{ projectId: p.id }} 
                      icon={<Hash size={14} />} 
                      label={p.name} 
                      active={location.pathname.startsWith(`/projects/${p.id}`)} 
                    />
                  ))
                )}
                
                {!isLoading && projects.length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-text-dim italic">Isolated space. No projects found.</div>
                )}
              </div>
            </div>
          </nav>

          {/* User Footer Section */}
          <div className="mt-auto p-3 border-t border-border-notion">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 p-3 bg-white/70 hover:bg-white rounded-2xl transition-colors group cursor-default border border-border-notion shadow-sm">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-focus-blue/15 to-sky-200/35 border border-focus-blue/10 flex items-center justify-center text-focus-blue overflow-hidden shadow-inner">
                  <User size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-text-notion leading-none mb-1 truncate">
                    {user?.username || 'Administrator'}
                  </p>
                  <p className="text-[10px] font-medium text-text-dim truncate tracking-wide">
                    Workspace Member
                  </p>
                </div>
                <button 
                  onClick={() => logout()}
                  className="p-2 rounded-lg text-text-dim hover:text-red-500 hover:bg-red-50 transition-all group/logout"
                  title="Log Out"
                >
                  <LogOut size={16} className="group-hover/logout:-translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
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
        ? 'bg-focus-blue-soft text-text-notion border-focus-blue/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_30px_rgba(35,131,226,0.08)]'
        : 'text-text-dim border-transparent hover:text-text-notion hover:bg-white/65 hover:border-border-notion'
      }`}
  >
    {icon && <span className={`shrink-0 ${active ? 'text-focus-blue' : 'opacity-60 group-hover:opacity-100'} transition-opacity`}>{icon}</span>}
    <span className="truncate tracking-tight uppercase tracking-widest text-[11px] font-bold">{label}</span>
  </Link>
);
