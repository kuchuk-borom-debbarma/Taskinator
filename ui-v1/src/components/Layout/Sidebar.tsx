import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { FolderPlus, Home, Loader2, LogOut, PanelLeftClose, PanelLeftOpen, Rocket, User2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import { AppModal, EmptyState, SurfaceCard, TextAreaField, TextField, formatRelativeVolume } from '../shared/workspace';

interface CreateProjectModalProps {
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose }) => {
  const { projectApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createProject = useMutation({
    mutationFn: () => projectApi.createProject(name.trim(), description.trim() || undefined),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      onClose();
      navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
    },
  });

  return (
    <AppModal
      open
      title="Create a new project"
      description="Start with a lightweight brief. You can shape tasks and teams after the project exists."
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          createProject.mutate();
        }}
      >
        <TextField
          label="Project name"
          value={name}
          onChange={setName}
          placeholder="Q3 launch prep"
          required
        />
        <TextAreaField
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="What this project is for, who it serves, and how success will look."
        />
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createProject.isPending || !name.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
            Create project
          </button>
        </div>
      </form>
    </AppModal>
  );
};

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { projectApi } = useApi();
  const location = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sidebar-projects'],
    queryFn: () => projectApi.getProjects(12),
    staleTime: 1000 * 60 * 3,
  });

  const projects = data?.projects ?? [];

  return (
    <>
      <aside
        className={`surface-sidebar custom-scrollbar hidden h-screen shrink-0 flex-col overflow-y-auto px-4 py-5 text-white transition-all duration-300 md:flex ${
          isSidebarCollapsed ? 'w-[88px]' : 'w-[320px]'
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className={`overflow-hidden transition-all ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Taskinator</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">Workspace</h2>
          </div>
          <button
            onClick={toggleSidebar}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
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
          <button
            onClick={() => setShowCreate(true)}
            className={`flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-left text-sm font-semibold text-white/88 transition hover:bg-white/10 ${
              isSidebarCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <FolderPlus size={18} className="shrink-0" />
            {!isSidebarCollapsed ? 'New project' : null}
          </button>
        </nav>

        <div className="mt-8">
          {!isSidebarCollapsed ? (
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Projects</p>
                <p className="mt-1 text-sm text-white/65">
                  {formatRelativeVolume(projects.length, 'active project')}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <Loader2 size={16} className="animate-spin" />
                {!isSidebarCollapsed ? 'Loading projects' : null}
              </div>
            ) : null}

            {!isLoading &&
              projects.map((project) => (
                <SidebarLink
                  key={project.id}
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  label={project.name}
                  subtitle={!isSidebarCollapsed ? `${project.tasksCount} tasks` : undefined}
                  icon={<Rocket size={18} />}
                  active={location.pathname.startsWith(`/projects/${project.id}`)}
                  collapsed={isSidebarCollapsed}
                />
              ))}

            {!isLoading && projects.length === 0 ? (
              isSidebarCollapsed ? null : (
                <EmptyState
                  icon={FolderPlus}
                  title="No projects yet"
                  description="Create the first project to populate your new workspace shell."
                  className="border border-white/10 bg-white/5 text-white"
                  action={
                    <button
                      onClick={() => setShowCreate(true)}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-app-ink transition hover:bg-white/90"
                    >
                      Create project
                    </button>
                  }
                />
              )
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-6">
          <SurfaceCard className="border border-white/10 bg-white/8 p-4 text-white shadow-none">
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white">
                <User2 size={18} />
              </div>
              {!isSidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.username ?? 'Workspace user'}</p>
                  <p className="text-xs text-white/55">Authenticated session</p>
                </div>
              ) : null}
            </div>
            {!isSidebarCollapsed ? (
              <button
                onClick={logout}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                <LogOut size={16} />
                Sign out
              </button>
            ) : (
              <button
                onClick={logout}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/8 p-3 text-white transition hover:bg-white/12"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </SurfaceCard>
        </div>
      </aside>

      {showCreate ? <CreateProjectModal onClose={() => setShowCreate(false)} /> : null}
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
        active ? 'bg-white text-app-ink shadow-lg' : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
      } ${collapsed ? 'justify-center px-0' : ''}`}
    >
      <div className={active ? 'text-app-accent' : 'text-white/70'}>{icon}</div>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{label}</p>
          {subtitle ? <p className={`text-xs ${active ? 'text-app-muted' : 'text-white/45'}`}>{subtitle}</p> : null}
        </div>
      ) : null}
    </Link>
  );
}
