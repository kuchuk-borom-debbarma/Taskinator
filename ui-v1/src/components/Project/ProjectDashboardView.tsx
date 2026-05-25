import { Link, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness, GitBranch, LayoutGrid, Users, CalendarDays, Activity } from 'lucide-react';
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
        <LoadingPane title="Loading Project Workspace" message="Pulling task, team, and member metrics from the server." />
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
    <div className="page-frame !pt-2 space-y-8 animate-fade-in">
      {/* Title Block */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200/50 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent mb-1 block">Project Workspace</span>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-app-ink">{project?.name}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-app-muted bg-slate-100/80 border border-slate-200/40 px-3.5 py-2 rounded-xl">
          <CalendarDays size={14} className="text-app-accent" />
          <span>Active since {formatDate(project?.createdAt)}</span>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Tasks" value={project?.tasksCount ?? 0} hint="Open and closed workflow issues" accent="orange" />
        <StatCard label="Assigned Teams" value={project?.teamsCount ?? 0} hint="Collaborating units inside project" accent="teal" />
        <StatCard label="Member Count" value={project?.projectMembersCount ?? 0} hint="Active workspace contributors" accent="ink" />
      </div>

      {/* Primary Content Split */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Recent Tasks (span-2) */}
        <div className="lg:col-span-2 space-y-6">
          <SurfaceCardStrong className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-app-accent-soft text-app-accent border border-app-accent/10">
                  <Activity size={18} />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-app-ink">Recent Tasks</h2>
              </div>
              <Link 
                to="/projects/$projectId/tasks" 
                params={{ projectId: resolvedProjectId! }} 
                className="inline-flex items-center gap-1 text-xs font-bold text-app-accent hover:text-app-accent/80 transition-colors"
              >
                View all tasks <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3.5">
              {project?.tasksCount === 0 ? (
                <EmptyState
                  icon={LayoutGrid}
                  title="No tasks yet"
                  description="No tasks have been created in this project. Start by creating one from the board."
                />
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    to="/projects/$projectId/tasks/$taskId"
                    params={{ projectId: resolvedProjectId!, taskId: task.id }}
                    className="block rounded-2xl border border-slate-200/60 hover:border-app-accent/35 bg-slate-50/30 p-4 transition-all duration-300 hover:translate-x-[2px] shadow-sm hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 max-w-xl">
                        <h3 className="text-sm font-bold text-app-ink leading-snug hover:text-app-accent transition-colors">{task.title}</h3>
                        {task.description ? (
                          <p className="text-xs text-app-muted truncate-2 leading-relaxed">{task.description}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3.5 border-t border-slate-200/40 flex flex-wrap items-center justify-between gap-3 text-[11px] text-app-muted">
                      <div className="flex items-center gap-4">
                        {task.team?.name ? (
                          <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/30">{task.team.name}</span>
                        ) : null}
                        {task.assignedMember?.username ? (
                          <span className="font-bold text-slate-600">@{task.assignedMember.username}</span>
                        ) : null}
                      </div>
                      <span>Updated {formatDate(task.updatedAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </SurfaceCardStrong>

          {/* Task Dependency Links */}
          <SurfaceCardStrong className="p-6 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-app-accent-2-soft text-app-accent-2 border border-app-accent-2/10">
                <GitBranch size={18} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-app-ink">Task Dependencies</h2>
            </div>

            <div className="space-y-3">
              {links.length === 0 ? (
                <EmptyState 
                  icon={GitBranch} 
                  title="No dependencies mapped" 
                  description="Relational dependencies between tasks are tracked here. Map them inside task details." 
                />
              ) : (
                links.slice(0, 4).map((link) => (
                  <div key={link.id} className="rounded-2xl border border-slate-200/60 bg-slate-50/30 p-4 transition-all duration-300">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <Link
                        to="/projects/$projectId/tasks/$taskId"
                        params={{ projectId: resolvedProjectId!, taskId: link.source.id }}
                        className="font-bold text-app-ink hover:text-app-accent transition-colors"
                      >
                        {link.source.title}
                      </Link>
                      <span className="rounded-full bg-app-accent-soft border border-app-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-app-accent uppercase tracking-wider">{link.label}</span>
                      <ArrowRight size={12} className="text-app-muted" />
                      <Link
                        to="/projects/$projectId/tasks/$taskId"
                        params={{ projectId: resolvedProjectId!, taskId: link.target.id }}
                        className="font-bold text-app-ink hover:text-app-accent transition-colors"
                      >
                        {link.target.title}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SurfaceCardStrong>
        </div>

        {/* Right Column: Teams and Members lists (span-1) */}
        <div className="space-y-6">
          {/* Teams card */}
          <SurfaceCard className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-app-accent-soft p-2.5 text-app-accent border border-app-accent/10">
                  <Users size={16} />
                </div>
                <h3 className="text-sm font-bold text-app-ink uppercase tracking-wider">Project Teams</h3>
              </div>
              <Link 
                to="/projects/$projectId/teams" 
                params={{ projectId: resolvedProjectId! }} 
                className="text-xs font-bold text-app-accent hover:underline"
              >
                All Teams
              </Link>
            </div>

            <div className="space-y-3">
              {project?.teamsCount === 0 ? (
                <p className="text-xs leading-relaxed text-app-muted">No teams assigned to this project yet.</p>
              ) : (
                teams.slice(0, 4).map((team) => (
                  <Link
                    key={team.id}
                    to="/projects/$projectId/teams/$teamId"
                    params={{ projectId: resolvedProjectId!, teamId: team.id }}
                    className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white/70 px-3.5 py-2.5 transition-all duration-300 hover:border-slate-300 hover:translate-x-[2px] shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-bold text-app-ink">{team.name}</p>
                      {team.createdAt ? <p className="text-[10px] text-app-muted">Added {formatDate(team.createdAt)}</p> : null}
                    </div>
                    <ArrowRight size={14} className="text-app-muted" />
                  </Link>
                ))
              )}
            </div>
          </SurfaceCard>

          {/* Members card */}
          <SurfaceCard className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-app-accent-2-soft p-2.5 text-app-accent-2 border border-app-accent-2/10">
                  <Users size={16} />
                </div>
                <h3 className="text-sm font-bold text-app-ink uppercase tracking-wider">Project Members</h3>
              </div>
              <Link 
                to="/projects/$projectId/members" 
                params={{ projectId: resolvedProjectId! }} 
                className="text-xs font-bold text-app-accent hover:underline"
              >
                All Members
              </Link>
            </div>

            <div className="space-y-3">
              {project?.projectMembersCount === 0 ? (
                <p className="text-xs leading-relaxed text-app-muted">No members joined this workspace yet.</p>
              ) : (
                members.slice(0, 5).map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-3 rounded-xl border border-slate-200/50 bg-white/70 px-3.5 py-2.5 shadow-sm"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-600 border border-slate-200/40">
                      {member.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-app-ink">@{member.user?.username || 'Unknown'}</p>
                      <p className="text-[10px] text-app-muted">Joined {formatDate(member.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
