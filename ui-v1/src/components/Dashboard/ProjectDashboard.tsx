import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, FolderPlus, FolderSearch, Loader2, Rocket } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { AppModal, EmptyState, PageHeader, StatCard, SurfaceCardStrong, TextAreaField, TextField, formatDate } from '../shared/workspace';

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

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectApi } = useApi();
  const [showCreate, setShowCreate] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['workspace-projects-list'],
    queryFn: ({ pageParam }) => projectApi.getProjects(9, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.endCursor ?? undefined : undefined),
    staleTime: 1000 * 60 * 3,
  });

  const projects = data?.pages.flatMap((page) => page.projects) ?? [];
  const totalProjects = data?.pages[0]?.totalCount ?? projects.length;
  const totalTasks = projects.reduce((sum, project) => sum + project.tasksCount, 0);
  const totalTeams = projects.reduce((sum, project) => sum + project.teamsCount, 0);

  return (
    <div className="page-frame">
      <SurfaceCardStrong className="hero-gradient mesh-backdrop overflow-hidden p-6 md:p-8">
        <PageHeader
          eyebrow="Workspace overview"
          title={`Welcome back${user?.username ? `, ${user.username}` : ''}`}
          description="Your projects now live in a clearer workspace: less hunting, faster decisions, and stronger execution context from the first click."
          actions={
            <>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
              >
                <FolderPlus size={16} />
                New project
              </button>
              {projects[0] ? (
                <button
                  onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: projects[0].id } })}
                  className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
                >
                  Resume latest
                  <ArrowRight size={16} />
                </button>
              ) : null}
            </>
          }
        />
      </SurfaceCardStrong>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Projects" value={totalProjects} hint="Active spaces you can step into." />
        <StatCard label="Tasks in view" value={totalTasks} hint="Current workload across the fetched project set." accent="teal" />
        <StatCard label="Teams" value={totalTeams} hint="Operating groups currently attached to these projects." accent="ink" />
      </div>

      <div className="mt-8">
        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Project lineup</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Choose the workstream to enter</h2>
            </div>
            <div className="rounded-full bg-app-ink/5 px-3 py-1.5 text-xs font-semibold text-app-muted">
              {projects.length} loaded
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[20rem] items-center justify-center">
              <Loader2 size={28} className="animate-spin text-app-accent" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderSearch}
              title="No projects yet"
              description="Create the first project to kick off the redesigned workspace flow."
              action={
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
                >
                  Create project
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="group rounded-[28px] border border-app-line bg-white/75 p-5 transition hover:-translate-y-0.5 hover:border-app-accent/30 hover:shadow-xl"
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 inline-flex rounded-full bg-app-accent-soft px-3 py-1 text-xs font-semibold text-app-accent">
                        v{project.version}
                      </div>
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-app-ink">{project.name}</h3>
                      <p className="mt-2 truncate-2 text-sm leading-6 text-app-muted">
                        {project.description || 'No project description yet. Open the project to shape its direction.'}
                      </p>
                    </div>
                    <div className="rounded-full border border-app-line bg-white p-2 text-app-muted transition group-hover:text-app-accent">
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <Metric label="Tasks" value={project.tasksCount} />
                    <Metric label="Teams" value={project.teamsCount} />
                    <Metric label="Members" value={project.projectMembersCount} />
                  </div>
                  <p className="mt-4 text-xs text-app-muted">Updated {formatDate(project.updatedAt || project.createdAt)}</p>
                </Link>
              ))}
            </div>
          )}

          {hasNextPage ? (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20 disabled:opacity-60"
            >
              {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              Load more projects
            </button>
          ) : null}
        </SurfaceCardStrong>
      </div>

      {showCreate ? <CreateProjectModal onClose={() => setShowCreate(false)} /> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-app-accent/10 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-app-ink">{value}</p>
    </div>
  );
}
