import React from 'react';
import { Outlet, Link, useParams, useLocation } from '@tanstack/react-router';
import { Layout, Users, Kanban, PanelLeft, PanelLeftClose } from 'lucide-react';
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
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Secondary Sub-nav */}
      <div className="flex items-center px-6 py-2 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all active:scale-95"
            title={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
          </button>

          <div className="flex gap-1">
            {navItems.map((item) => {
              const reallyActive = item.label === 'Dashboard' 
                ? location.pathname === `/projects/${projectId}` || location.pathname === `/projects/${projectId}/`
                : location.pathname.includes(item.to.replace('$projectId', projectId));

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  params={{ projectId }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    reallyActive 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
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

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
