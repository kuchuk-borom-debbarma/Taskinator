import React from 'react';

import { Link, useLocation } from '@tanstack/react-router';
import { Home, LogOut, PanelLeftClose, PanelLeftOpen, User2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import { SurfaceCard } from '../shared/workspace';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useLayout();



  return (
    <>
      <aside
        className={`surface-sidebar custom-scrollbar hidden h-screen shrink-0 flex-col overflow-y-auto px-4 py-5 transition-all duration-300 md:flex ${
          isSidebarCollapsed ? 'w-[88px]' : 'w-[320px]'
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className={`overflow-hidden transition-all ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-app-muted">Taskinator</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-app-ink">Workspace</h2>
          </div>
          <button
            onClick={toggleSidebar}
            className="rounded-full border border-app-line bg-white/60 p-2 text-app-muted transition hover:bg-white hover:text-app-ink shadow-sm"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="space-y-2">
          <SidebarLink
            to="/"
            label="Workspace Home"
            icon={<Home size={18} />}
            active={location.pathname === '/'}
            collapsed={isSidebarCollapsed}
          />
        </nav>



        <div className="mt-auto pt-6">
          <SurfaceCard className="border border-app-line bg-white/60 p-4 shadow-none">
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-app-accent/10 text-app-accent">
                <User2 size={18} />
              </div>
              {!isSidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-app-ink">{user?.username ?? 'Workspace user'}</p>
                  <p className="text-xs text-app-muted">Authenticated session</p>
                </div>
              ) : null}
            </div>
            {!isSidebarCollapsed ? (
              <button
                onClick={logout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-app-danger/10 px-4 py-3 text-sm font-semibold text-app-danger transition hover:bg-app-danger/20"
              >
                <LogOut size={16} />
                Sign out
              </button>
            ) : (
              <button
                onClick={logout}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-app-danger/10 text-app-danger transition hover:bg-app-danger/20"
                aria-label="Sign out"
              >
                <LogOut size={16} />
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
      className={`flex items-center gap-3 rounded-[22px] px-4 py-3 transition ${
        active ? 'bg-app-accent/10 text-app-accent shadow-sm' : 'bg-transparent text-app-muted hover:bg-white/60 hover:text-app-ink'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      <div className={active ? 'text-app-accent' : 'text-app-muted'}>{icon}</div>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{label}</p>
          {subtitle ? <p className={`text-xs ${active ? 'text-app-accent/70' : 'text-app-muted/70'}`}>{subtitle}</p> : null}
        </div>
      ) : null}
    </Link>
  );
}
