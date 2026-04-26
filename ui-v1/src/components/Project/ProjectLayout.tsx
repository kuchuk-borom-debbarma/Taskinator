import React from 'react';
import { Outlet, Link, useParams, useLocation } from '@tanstack/react-router';
import { Layout, Users, Kanban, Orbit, PanelLeft, PanelLeftClose } from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';

export const ProjectLayout: React.FC = () => {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId' });
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useLayout();

  const navItems = [
    { label: 'Dashboard', icon: Layout, to: '/projects/$projectId' as const },
    { label: 'Tasks', icon: Kanban, to: '/projects/$projectId/tasks' as const },
    { label: 'Teams', icon: Users, to: '/projects/$projectId/teams' as const },
    { label: 'Members', icon: Users, to: '/projects/$projectId/members' as const },
    { label: 'Flow Map', icon: Orbit, to: '/graph/$projectId' as const, fullscreen: true },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-app-line/80 bg-white/45 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="page-frame !max-w-none !px-0 !py-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-line bg-white/75 text-app-muted transition hover:border-app-ink/20 hover:text-app-ink"
                title={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
                aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
              >
                {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <div>
                <p className="eyebrow">Project space</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-app-ink">Execution workspace</h1>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = item.fullscreen
                  ? location.pathname === `/graph/${projectId}`
                  : item.label === 'Dashboard'
                    ? location.pathname === `/projects/${projectId}` || location.pathname === `/projects/${projectId}/`
                    : location.pathname.startsWith(item.to.replace('$projectId', projectId));

                if (item.fullscreen) {
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      params={{ projectId }}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'bg-app-accent text-white'
                          : 'border border-app-line bg-white/75 text-app-ink hover:border-app-ink/20'
                      }`}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    params={{ projectId }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-app-ink text-white'
                        : 'border border-app-line bg-white/75 text-app-ink hover:border-app-ink/20'
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};
