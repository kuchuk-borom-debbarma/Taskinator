import React from 'react';
import { Outlet, Link, useParams, useLocation } from '@tanstack/react-router';
import { Layout, Users, Kanban } from 'lucide-react';

export const ProjectLayout: React.FC = () => {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId' });
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: Layout, to: '/projects/$projectId/' as const },
    { label: 'Tasks', icon: Kanban, to: '/projects/$projectId/tasks' as const },
    { label: 'Teams', icon: Users, to: '/projects/$projectId/teams' as const },
    { label: 'Members', icon: Users, to: '/projects/$projectId/members' as const },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Secondary Sub-nav */}
      <div className="flex items-center px-6 py-2 border-b border-white/5 bg-white/5 backdrop-blur-md">
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

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
