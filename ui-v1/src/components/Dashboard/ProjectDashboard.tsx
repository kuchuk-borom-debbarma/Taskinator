import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, FolderPlus, FolderSearch, Loader2 } from 'lucide-react';
import { PagingButton } from '../shared/PagingButton';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, PageHeader, StatCard, SurfaceCardStrong, formatDate } from '../shared/workspace';
import { useLayout } from '../../context/LayoutContext';
import { CONFIG } from '../../config';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectApi } = useApi();
  const { setCreateProjectModalOpen } = useLayout();

  const searchParams = useSearch({ strict: false }) as any;
  const cursor = searchParams.cursor;
  const direction = searchParams.direction;

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-projects-list', cursor, direction],
    queryFn: () => projectApi.getProjects(
      direction === 'backward'
        ? { last: CONFIG.PAGINATION.PROJECTS_LIST, before: cursor }
        : { first: CONFIG.PAGINATION.PROJECTS_LIST, after: cursor }
    ),
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
    placeholderData: (prev) => prev,
  });

  const projects = data?.projects ?? [];
  const pageInfo = data?.pageInfo;
  const totalProjects = data?.totalCount ?? projects.length;
  const totalTasks = projects.reduce((sum, project) => sum + project.tasksCount, 0);
  const totalTeams = projects.reduce((sum, project) => sum + project.teamsCount, 0);

  const handleNext = () => {
    if (pageInfo?.hasNextPage) {
      navigate({ search: { cursor: pageInfo.endCursor, direction: 'forward' } });
    }
  };

  const handlePrev = () => {
    if (pageInfo?.hasPreviousPage) {
      navigate({ search: { cursor: pageInfo.startCursor, direction: 'backward' } });
    }
  };

  return (
    <div className="page-frame">
      <SurfaceCardStrong className="hero-gradient mesh-backdrop overflow-hidden p-6 md:p-8">
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome back${user?.username ? `, ${user.username}` : ''}`}
          description="Manage your projects and track progress across your workspace."
          actions={
            <>
              <button
                onClick={() => setCreateProjectModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
              >
                <FolderPlus size={16} />
                New project
              </button>
            </>
          }
        />
      </SurfaceCardStrong>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Projects" value={totalProjects} hint="" />
        <StatCard label="Tasks in view" value={totalTasks} hint="" accent="teal" />
        <StatCard label="Teams" value={totalTeams} hint="" accent="ink" />
      </div>

      <div className="mt-8">
        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Projects</h2>
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
                  onClick={() => setCreateProjectModalOpen(true)}
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

                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-app-ink">{project.name}</h3>
                      <p className="mt-2 truncate-2 text-sm leading-6 text-app-muted">
                        {project.description || 'No description provided.'}
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

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-app-line pt-6">
            <PagingButton disabled={!pageInfo?.hasPreviousPage} onClick={handlePrev}>
              <ArrowLeft size={14} />
              Prev
            </PagingButton>
            <PagingButton disabled={!pageInfo?.hasNextPage} onClick={handleNext}>
              Next
              <ArrowRight size={14} />
            </PagingButton>
          </div>
        </SurfaceCardStrong>
      </div>


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
