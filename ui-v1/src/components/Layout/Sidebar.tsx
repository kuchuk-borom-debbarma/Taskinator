import React, { useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Plus,
  Search,
  Hash,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { projectApi } = useApi();
  const { logout, user } = useAuth();
  const location = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);

  const {
    data: projectsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['sidebar-projects-list'],
    queryFn: ({ pageParam }) => projectApi.getProjects(10, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  const projects = useMemo(() =>
    projectsData?.pages.flatMap(page => page.projects) || [],
    [projectsData]
  );

  return (
    <>
      <aside className="w-72 h-screen glass-dark text-white flex flex-col overflow-hidden shrink-0 select-none m-3 mr-0 rounded-[28px]">
        {/* Workspace Header */}
        <div className="p-5 flex items-center justify-between group cursor-default border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-focus-blue to-blue-400 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-focus-blue/30">
              T
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-tight leading-none mb-0.5">Taskinator Workspace</span>
              <span className="text-[10px] font-medium text-white/35 uppercase tracking-[0.28em] leading-none">Pro Edition</span>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="px-3 pt-4 space-y-1">
          <button
            onClick={() => {
              const input = document.querySelector('input[type="search"]') as HTMLInputElement;
              if (input) input.focus();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-white/55 hover:text-white/80 hover:bg-white/[0.05] rounded-xl transition-all text-xs font-medium group border border-transparent hover:border-white/8"
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-6 flex flex-col overflow-hidden">
          <div className="mb-1">
            <SidebarItem 
              to="/" 
              icon={<LayoutDashboard size={14} />} 
              label="Dashboard" 
              active={location.pathname === '/'} 
            />
          </div>

          <div className="px-3 pt-8 pb-2 flex items-center justify-between group">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim opacity-40 text-white/20">Projects</h3>
            <button 
              onClick={() => setShowCreateProject(true)}
              className="p-1 rounded-md hover:bg-white/5 text-text-dim opacity-0 group-hover:opacity-100 transition-all text-white/20"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
            {isLoading ? (
               <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/20 italic">
                 <Loader2 size={12} className="animate-spin" /> Loading...
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
            
            {hasNextPage && (
              <button 
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-2 px-3 flex items-center gap-2 text-[10px] font-bold text-focus-blue hover:text-focus-blue/80 transition-all opacity-60 hover:opacity-100"
              >
                {isFetchingNextPage ? '...' : '+ Show more'}
              </button>
            )}
            
            {!isLoading && projects.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-white/15 italic">No projects yet.</div>
            )}
          </div>
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

      {/* Placeholder for project modal trigger if needed */}
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