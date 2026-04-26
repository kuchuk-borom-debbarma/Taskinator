import { Link, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness, LayoutGrid, Orbit, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { Project } from '../../api/types';
import { EmptyState, LoadingPane, PageHeader, PriorityBadge, StatCard, StatusBadge, SurfaceCard, SurfaceCardStrong, formatDate } from '../shared/workspace';

const getCachedProject = (queryClient: ReturnType<typeof useQueryClient>, projectId: string) => {
  const direct = queryClient.getQueryData<Project>(['project', projectId]);
  if (direct) return direct;

  const projectLists = [
    ...queryClient.getQueriesData<{ projects: Project[] }>({ queryKey: ['workspace-projects-list'] }),
    ...queryClient.getQueriesData<{ projects: Project[] }>({ queryKey: ['sidebar-projects'] }),
  ];

  for (const [, page] of projectLists) {
    const match = page?.projects?.find((entry) => entry.id === projectId);
    if (match) return match;
  }

  return undefined;
};

export default function ProjectDashboardView() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { projectApi } = useApi();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['project-dashboard', projectId],
    queryFn: () => projectApi.getProjectDashboardData(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 3,
    initialData: () => {
      if (!projectId) return undefined;
      const project = getCachedProject(queryClient, projectId);
      return project ? { project, teams: [], tasks: [], members: [] } : undefined;
    },
  });

  const project = data?.project;
  const tasks = data?.tasks ?? [];
  const teams = data?.teams ?? [];
  const members = data?.members ?? [];
  const resolvedProjectId = projectId ?? project?.id;
  const doneCount = tasks.filter((task) => task.status === 'DONE').length;
  const inProgressCount = tasks.filter((task) => task.status === 'IN_PROGRESS').length;

  if (isLoading) {
    return (
      <div className="page-frame">
        <LoadingPane title="Loading project workspace" message="Pulling task, team, and member summaries." />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="page-frame">
        <EmptyState
          icon={BriefcaseBusiness}
          title="Project unavailable"
          description={(error as Error | undefined)?.message || 'We could not load this project right now.'}
        />
      </div>
    );
  }

  return (
    <div className="page-frame">
      <SurfaceCardStrong className="hero-gradient overflow-hidden p-6 md:p-8">
        <PageHeader
          eyebrow="Project overview"
          title={project.name}
          description={project.description || 'This project does not have a written brief yet, but the execution view below still gives the team a clear operating picture.'}
          actions={
            <>
              <Link
                to="/projects/$projectId/tasks"
                params={{ projectId: resolvedProjectId! }}
                className="inline-flex items-center gap-2 rounded-full bg-app-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-ink/92"
              >
                Open tasks
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/graph/$projectId"
                params={{ projectId: resolvedProjectId! }}
                className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
              >
                <Orbit size={16} />
                View flow map
              </Link>
            </>
          }
        />
      </SurfaceCardStrong>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Tasks" value={project.tasksCount} hint="Current recorded scope." />
        <StatCard label="Done" value={doneCount} hint="Execution items completed." accent="teal" />
        <StatCard label="In progress" value={inProgressCount} hint="Tasks actively moving." accent="ink" />
        <StatCard label="Teams" value={project.teamsCount} hint="Groups attached to this project." />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <SurfaceCardStrong className="p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Execution snapshot</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Recent tasks</h2>
              </div>
              <Link to="/projects/$projectId/tasks" params={{ projectId: resolvedProjectId! }} className="text-sm font-semibold text-app-accent">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <EmptyState
                  icon={LayoutGrid}
                  title="No tasks yet"
                  description="Create tasks from the tasks view and they will immediately enrich the overview here."
                />
              ) : (
                tasks.map((task) => (
                  <Link
                    key={task.id}
                    to="/projects/$projectId/tasks/$taskId"
                    params={{ projectId: resolvedProjectId!, taskId: task.id }}
                    className="block rounded-[24px] border border-app-line bg-white/75 p-4 transition hover:border-app-accent/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-2xl">
                        <h3 className="text-lg font-semibold text-app-ink">{task.title}</h3>
                        <p className="mt-2 truncate-2 text-sm leading-6 text-app-muted">
                          {task.description || 'No description provided for this task yet.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-5 text-sm text-app-muted">
                      <span>{task.team?.name || 'No team assigned'}</span>
                      <span>{task.assignedMember?.username || 'No owner assigned'}</span>
                      <span>Updated {formatDate(task.updatedAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </SurfaceCardStrong>

          <div className="grid gap-6 lg:grid-cols-2">
            <SurfaceCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-app-accent-soft p-3 text-app-accent">
                  <Users size={18} />
                </div>
                <div>
                  <p className="eyebrow">Teams</p>
                  <h3 className="text-xl font-semibold text-app-ink">Active squads</h3>
                </div>
              </div>
              <div className="space-y-3">
                {teams.slice(0, 4).map((team) => (
                  <Link
                    key={team.id}
                    to="/projects/$projectId/teams/$teamId"
                    params={{ projectId: resolvedProjectId!, teamId: team.id }}
                    className="flex items-center justify-between rounded-2xl border border-app-line bg-white/75 px-4 py-3 transition hover:border-app-ink/20"
                  >
                    <div>
                      <p className="text-sm font-semibold text-app-ink">{team.name}</p>
                      <p className="text-xs text-app-muted">Created {formatDate(team.createdAt)}</p>
                    </div>
                    <ArrowRight size={16} className="text-app-muted" />
                  </Link>
                ))}
                {teams.length === 0 ? <p className="text-sm leading-6 text-app-muted">No teams attached to this project yet.</p> : null}
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-app-accent-2-soft p-3 text-app-accent-2">
                  <Users size={18} />
                </div>
                <div>
                  <p className="eyebrow">Members</p>
                  <h3 className="text-xl font-semibold text-app-ink">People in scope</h3>
                </div>
              </div>
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div key={member.id} className="rounded-2xl border border-app-line bg-white/75 px-4 py-3">
                    <p className="text-sm font-semibold text-app-ink">{member.user?.username || 'Unknown member'}</p>
                    <p className="text-xs text-app-muted">Joined {formatDate(member.createdAt)}</p>
                  </div>
                ))}
                {members.length === 0 ? <p className="text-sm leading-6 text-app-muted">No members attached yet.</p> : null}
              </div>
            </SurfaceCard>
          </div>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="p-5">
            <p className="eyebrow mb-2">Project health</p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-app-ink">What this screen is for</h3>
            <p className="mt-3 text-sm leading-7 text-app-muted">
              This overview is now a true orientation layer: enough signal to understand health, enough structure to decide where to dive next.
            </p>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <p className="eyebrow mb-2">Meta</p>
            <div className="space-y-4 text-sm text-app-muted">
              <div className="rounded-2xl bg-app-ink/4 px-4 py-4">
                <p className="font-semibold text-app-ink">Created</p>
                <p className="mt-1">{formatDate(project.createdAt)}</p>
              </div>
              <div className="rounded-2xl bg-app-ink/4 px-4 py-4">
                <p className="font-semibold text-app-ink">Updated</p>
                <p className="mt-1">{formatDate(project.updatedAt || project.createdAt)}</p>
              </div>
              <div className="rounded-2xl bg-app-ink/4 px-4 py-4">
                <p className="font-semibold text-app-ink">Version</p>
                <p className="mt-1">v{project.version}</p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
