import React from 'react';
import { Outlet, Link, useParams, useLocation } from '@tanstack/react-router';
import { Layout, Users, Kanban } from 'lucide-react';

export const ProjectLayout: React.FC = () => {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId' });
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: Layout, to: '/projects/$projectId' as const },
    { label: 'Tasks', icon: Kanban, to: '/projects/$projectId/tasks' as const },
    { label: 'Teams', icon: Users, to: '/projects/$projectId/teams' as const },
    { label: 'Members', icon: Users, to: '/projects/$projectId/members' as const },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-app-line/80 bg-white/45 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="page-frame !max-w-none !px-0 !py-0">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active =
                item.label === 'Dashboard'
                  ? location.pathname === `/projects/${projectId}` || location.pathname === `/projects/${projectId}/`
                  : location.pathname.startsWith(item.to.replace('$projectId', projectId));

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

      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};
