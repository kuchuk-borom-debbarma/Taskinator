import { Link, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness, GitBranch, LayoutGrid, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { Project } from '../../api/types';
import { EmptyState, LoadingPane, PriorityBadge, StatCard, StatusBadge, SurfaceCard, SurfaceCardStrong, formatDate } from '../shared/workspace';
import { CONFIG } from '../../config';

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
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
    placeholderData: () => {
      if (!projectId) return undefined;
      const project = getCachedProject(queryClient, projectId);
      return project ? { project, teams: [], tasks: [], members: [], links: [] } : undefined;
    },
  });

  const project = data?.project;
  const tasks = data?.tasks ?? [];
  const teams = data?.teams ?? [];
  const members = data?.members ?? [];
  const links = data?.links ?? [];
  const resolvedProjectId = projectId ?? project?.id;

  const isActuallyLoading = isLoading || (!project && !isError);

  if (isActuallyLoading) {
    return (
      <div className="page-frame">
        <LoadingPane title="Loading project workspace" message="Pulling task, team, and member summaries." />
      </div>
    );
  }

  if (isError) {
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
    <div className="page-frame !pt-2">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Tasks" value={project?.tasksCount ?? 0} hint="Total tasks in this project." />
        <StatCard label="Teams" value={project?.teamsCount ?? 0} hint="Groups attached to this project." />
      </div>

      <div className="mt-8 space-y-6">
        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Tasks</p>
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
                description="No tasks returned for this project."
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
                      {task.description ? (
                        <p className="mt-2 truncate-2 text-sm leading-6 text-app-muted">{task.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-app-muted">
                    {task.team?.name ? <span>{task.team.name}</span> : null}
                    {task.assignedMember?.username ? <span>{task.assignedMember.username}</span> : null}
                    <span>Updated {formatDate(task.updatedAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </SurfaceCardStrong>

        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Links</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Recent task links</h2>
            </div>
          </div>

          <div className="space-y-3">
            {links.length === 0 ? (
              <EmptyState icon={GitBranch} title="No task links yet" description="Create task links from task details." />
            ) : (
              links.map((link) => (
                <div key={link.id} className="rounded-[24px] border border-app-line bg-white/75 p-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Link
                      to="/projects/$projectId/tasks/$taskId"
                      params={{ projectId: resolvedProjectId!, taskId: link.source.id }}
                      className="font-semibold text-app-ink hover:text-app-accent"
                    >
                      {link.source.title}
                    </Link>
                    <span className="rounded-full bg-app-accent/10 px-3 py-1 text-xs font-semibold text-app-accent">{link.label}</span>
                    <ArrowRight size={14} className="text-app-muted" />
                    <Link
                      to="/projects/$projectId/tasks/$taskId"
                      params={{ projectId: resolvedProjectId!, taskId: link.target.id }}
                      className="font-semibold text-app-ink hover:text-app-accent"
                    >
                      {link.target.title}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCardStrong>

        <div className="grid gap-6 lg:grid-cols-2">
          <SurfaceCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-app-accent-soft p-3 text-app-accent">
                  <Users size={18} />
                </div>
                <div>
                  <p className="eyebrow">Teams</p>
                  <h3 className="text-xl font-semibold text-app-ink">Teams</h3>
                </div>
              </div>
              <Link to="/projects/$projectId/teams" params={{ projectId: resolvedProjectId! }} className="text-sm font-semibold text-app-accent">
                View all
              </Link>
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
                    {team.createdAt ? <p className="text-xs text-app-muted">Created {formatDate(team.createdAt)}</p> : null}
                  </div>
                  <ArrowRight size={16} className="text-app-muted" />
                </Link>
              ))}
              {teams.length === 0 ? <p className="text-sm leading-6 text-app-muted">No teams returned.</p> : null}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-app-accent-2-soft p-3 text-app-accent-2">
                  <Users size={18} />
                </div>
                <div>
                  <p className="eyebrow">Members</p>
                  <h3 className="text-xl font-semibold text-app-ink">Members</h3>
                </div>
              </div>
              <Link to="/projects/$projectId/members" params={{ projectId: resolvedProjectId! }} className="text-sm font-semibold text-app-accent">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {members.slice(0, 5).map((member) => (
                <div key={member.id} className="rounded-2xl border border-app-line bg-white/75 px-4 py-3">
                  <p className="text-sm font-semibold text-app-ink">{member.user?.username || 'Unknown member'}</p>
                  <p className="text-xs text-app-muted">Joined {formatDate(member.createdAt)}</p>
                </div>
              ))}
              {members.length === 0 ? <p className="text-sm leading-6 text-app-muted">No members returned.</p> : null}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
