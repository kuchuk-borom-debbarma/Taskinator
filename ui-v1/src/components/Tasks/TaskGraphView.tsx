import { useMemo } from 'react';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Network, Orbit } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { ProjectTask } from '../../api/types';
import { EmptyState, PriorityBadge, StatusBadge, SurfaceCard, SurfaceCardStrong } from '../shared/workspace';

export const TaskGraphView: React.FC = () => {
  const { projectId } = useParams({ from: '/fullscreen-layout/graph/$projectId' });
  const search = useSearch({ from: '/fullscreen-layout/graph/$projectId' }) as { taskId?: string };
  const focusedTaskId = search.taskId;
  const { taskApi } = useApi();

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ['task-graph-page', focusedTaskId],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      return taskApi.getTaskGraphPage(focusedTaskId!, { first: 12, after: cursor });
    },
    enabled: !!focusedTaskId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.endCursor ?? undefined : undefined),
    staleTime: 1000 * 60 * 3,
  });

  const graph = useMemo(() => {
    const pages = data?.pages ?? [];
    const task = pages[0]?.task ?? null;
    const incomingMap = new Map<string, ProjectTask>();
    const outgoingMap = new Map<string, ProjectTask>();

    for (const page of pages) {
      for (const link of page.links) {
        incomingMap.set(link.source.id, { ...link.source, description: '', version: 1, createdAt: '', updatedAt: '', status: link.source.status as any, priority: link.source.priority } as ProjectTask);
        outgoingMap.set(link.target.id, { ...link.target, description: '', version: 1, createdAt: '', updatedAt: '', status: link.target.status as any, priority: link.target.priority } as ProjectTask);
      }
    }

    return {
      task,
      incoming: Array.from(incomingMap.values()),
      outgoing: Array.from(outgoingMap.values()),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="page-frame">
        <div className="flex min-h-[18rem] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-app-accent" />
        </div>
      </div>
    );
  }

  if (!graph.task) {
    return (
      <div className="page-frame">
        <EmptyState
          icon={Network}
          title="No flow context yet"
          description="Open the graph from a task detail page so the focus task is defined."
        />
      </div>
    );
  }

  return (
    <div className="page-frame">
      <SurfaceCardStrong className="hero-gradient p-6 md:p-8">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            to="/projects/$projectId/tasks"
            params={{ projectId }}
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            <ArrowLeft size={15} />
            Back to tasks
          </Link>
        </div>
        <p className="eyebrow mb-3">Flow map</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-app-ink">{graph.task.title}</h1>
            <p className="mt-3 text-base leading-7 text-app-muted">
              This map trades the old dense graph canvas for a clearer upstream and downstream dependency story.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={graph.task.status} />
            <PriorityBadge priority={graph.task.priority} />
          </div>
        </div>
      </SurfaceCardStrong>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.8fr_1fr]">
        <FlowColumn
          title="Upstream blockers"
          subtitle="Things that feed into this task"
          tasks={graph.incoming}
        />
        <SurfaceCardStrong className="flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-app-accent-soft p-4 text-app-accent">
            <Orbit size={28} />
          </div>
          <p className="eyebrow mt-4">Focused task</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-app-ink">{graph.task.title}</h2>
          <p className="mt-3 text-sm leading-7 text-app-muted">{graph.task.description || 'No additional description is available for this task.'}</p>
        </SurfaceCardStrong>
        <FlowColumn
          title="Downstream impact"
          subtitle="Things this task unlocks or affects"
          tasks={graph.outgoing}
        />
      </div>
    </div>
  );
};

function FlowColumn({
  title,
  subtitle,
  tasks,
}: {
  title: string;
  subtitle: string;
  tasks: ProjectTask[];
}) {
  return (
    <SurfaceCard className="p-5">
      <p className="eyebrow mb-2">{title}</p>
      <p className="mb-4 text-sm leading-6 text-app-muted">{subtitle}</p>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm leading-6 text-app-muted">No linked tasks in this direction yet.</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="rounded-[24px] border border-app-line bg-white/75 px-4 py-4">
              <p className="text-sm font-semibold text-app-ink">{task.title}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
              <p className="mt-2 text-xs text-app-muted">{task.team?.name || 'No team assigned'}</p>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}
