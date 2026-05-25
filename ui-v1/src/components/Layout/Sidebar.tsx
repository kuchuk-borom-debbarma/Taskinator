import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Link, useLocation } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Home, LogOut, PanelLeftClose, PanelLeftOpen, User2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import { useApi } from '../../hooks/useApi';
import { Plus } from 'lucide-react';
import { SurfaceCard } from '../shared/workspace';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar, setCreateProjectModalOpen } = useLayout();
  const { projectApi } = useApi();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<'forward' | 'backward' | undefined>(undefined);

  const projectsPerPage = 8;

  const { data, isLoading } = useQuery({
    queryKey: ['sidebar-projects', cursor, direction],
    queryFn: () => projectApi.getProjects(
      direction === 'backward'
        ? { last: projectsPerPage, before: cursor }
        : { first: projectsPerPage, after: cursor }
    ),
  });

  const projects = data?.projects ?? [];
  const pageInfo = data?.pageInfo;
  const totalProjects = data?.totalCount ?? 0;

  const handlePrevPage = () => {
    if (pageInfo?.hasPreviousPage) {
      setCursor(pageInfo.startCursor ?? undefined);
      setDirection('backward');
    }
  };

  const handleNextPage = () => {
    if (pageInfo?.hasNextPage) {
      setCursor(pageInfo.endCursor ?? undefined);
      setDirection('forward');
    }
  };

  React.useEffect(() => {
    if (location.pathname.includes('/projects/')) {
      // Sync logic might be more complex with server-side pagination, 
      // but for now let's just make sure we are not stuck on a wrong page.
    }
  }, [location.pathname]);

  return (
    <>
      <aside
        className={`surface-sidebar custom-scrollbar hidden h-screen shrink-0 flex-col overflow-y-auto px-4 py-5 transition-all duration-300 md:flex ${
          isSidebarCollapsed ? 'w-[84px]' : 'w-[290px]'
        }`}
      >
        <div className="mb-8 flex items-center justify-between gap-3 shrink-0">
          <div className={`overflow-hidden transition-all ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-app-accent to-indigo-600 text-white shadow-md shadow-app-accent/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-app-ink to-slate-700 bg-clip-text text-transparent">Task-In</span>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="rounded-xl border border-slate-200 bg-white/70 p-2 text-app-muted transition hover:bg-slate-50 hover:text-app-ink shadow-sm cursor-pointer shrink-0"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="space-y-1.5 flex-1">
          <SidebarLink
            to="/"
            label="Home"
            icon={<Home size={18} />}
            active={location.pathname === '/'}
            collapsed={isSidebarCollapsed}
          />

          {!isSidebarCollapsed && totalProjects ? (
            <div className="mt-8 px-2 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-app-muted/65">Projects</p>
                {(pageInfo?.hasNextPage || pageInfo?.hasPreviousPage) && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrevPage}
                      disabled={!pageInfo?.hasPreviousPage}
                      className="rounded-lg p-1 text-app-muted transition hover:bg-slate-100 hover:text-app-ink disabled:opacity-30 cursor-pointer"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!pageInfo?.hasNextPage}
                      className="rounded-lg p-1 text-app-muted transition hover:bg-slate-100 hover:text-app-ink disabled:opacity-30 cursor-pointer"
                      aria-label="Next page"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-app-accent border-t-transparent" />
                  </div>
                ) : (
                  projects.map((project) => {
                    const isProjectActive = location.pathname.includes(project.id);
                    return (
                      <Link
                        key={project.id}
                        to="/projects/$projectId"
                        params={{ projectId: project.id }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 border ${
                          isProjectActive
                            ? 'bg-app-accent-soft text-app-accent border-app-accent/15 shadow-sm'
                            : 'text-app-muted hover:bg-slate-100 hover:text-app-ink border-transparent'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${isProjectActive ? 'bg-app-accent' : 'bg-slate-300 group-hover:bg-app-ink'}`} />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          <button
            onClick={() => setCreateProjectModalOpen(true)}
            className={`mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-200 hover:border-app-accent/40 px-4 py-2.5 text-app-accent hover:text-app-accent bg-transparent hover:bg-app-accent-soft transition-all duration-300 cursor-pointer ${
              isSidebarCollapsed ? 'justify-center px-0 border-transparent' : ''
            }`}
          >
            <Plus size={16} />
            {!isSidebarCollapsed && <span className="text-xs font-extrabold uppercase tracking-wider">New Project</span>}
          </button>
        </nav>

        <div className="shrink-0 mt-auto pt-6">
          <SurfaceCard className="border border-slate-200/60 bg-white/70 p-3.5 shadow-none backdrop-blur-md">
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent border border-app-accent/10">
                <User2 size={16} />
              </div>
              {!isSidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-app-ink">{user?.username ?? 'Workspace user'}</p>
                </div>
              ) : null}
            </div>
            {!isSidebarCollapsed ? (
              <button
                onClick={logout}
                className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 px-3 py-2 text-xs font-bold text-red-600 transition duration-300 cursor-pointer"
              >
                <LogOut size={13} />
                Sign out
              </button>
            ) : (
              <button
                onClick={logout}
                className="mt-3.5 flex h-9 w-full items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition duration-300 cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut size={13} />
              </button>
            )}
          </SurfaceCard>
        </div>
      </aside>
    </>
  );
};

function SidebarLink({
  to,
  params,
  label,
  subtitle,
  icon,
  active,
  collapsed,
}: {
  to: '/' | '/projects/$projectId';
  params?: { projectId: string };
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      to={to}
      params={params as never}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 border ${
        active 
          ? 'bg-app-accent-soft text-app-accent border-app-accent/15 shadow-sm font-bold' 
          : 'bg-transparent text-app-muted hover:bg-slate-100 hover:text-app-ink border-transparent font-semibold'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      <div className={active ? 'text-app-accent' : 'text-app-muted'}>{icon}</div>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm">{label}</p>
          {subtitle ? <p className={`text-[10px] ${active ? 'text-app-accent/70' : 'text-app-muted/70'}`}>{subtitle}</p> : null}
        </div>
      ) : null}
    </Link>
  );
}
