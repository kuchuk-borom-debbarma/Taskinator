import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowRight, Filter, FolderKanban, Loader2, Plus, Search } from 'lucide-react';
import { useApi } from './hooks/useApi';
import type { ProjectTask } from './api/types';
import {
  AppModal,
  EmptyState,
  PriorityBadge,
  StatusBadge,
  SurfaceCard,
  SurfaceCardStrong,
  TextAreaField,
  TextField,
  formatDate,
} from './components/shared/workspace';

type TaskSearch = {
  cursor?: string;
  direction?: 'forward' | 'backward';
};

export default function ProjectTasksIndex() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/tasks' }) as TaskSearch;
  const { taskApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['tasks', projectId, cursor, direction],
    queryFn: () => {
      if (direction === 'backward') {
        return taskApi.getTasks(projectId!, { last: 12, before: cursor });
      }
      return taskApi.getTasks(projectId!, {
        first: 12,
        after: direction === 'forward' ? cursor : undefined,
      });
    },
    enabled: !!projectId,
    placeholderData: (previous) => previous,
    staleTime: 1000 * 60 * 3,
  });

  const createTask = useMutation({
    mutationFn: () => taskApi.createTask({ projectId: projectId!, title: title.trim(), description: description.trim() || undefined }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      queryClient.setQueryData(['task', task.id], task);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      navigate({ to: '/projects/$projectId/tasks/$taskId', params: { projectId: projectId!, taskId: task.id } });
    },
  });

  const tasks = data?.tasks ?? [];
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.team?.name?.toLowerCase().includes(q) ||
        task.assignedMember?.username?.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, tasks]);

  return (
    <div className="page-frame">
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <SurfaceCard className="p-5">
          <p className="eyebrow mb-2">Filter tasks</p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Focus the current slice</h2>

          <label className="mt-5 block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-app-ink">
              <Search size={15} />
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, description, team, or assignee"
              className="w-full rounded-2xl border border-app-line bg-white/80 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
            />
          </label>

          <div className="mt-5">
            <span className="mb-3 flex items-center gap-2 text-sm font-medium text-app-ink">
              <Filter size={15} />
              Status
            </span>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setStatusFilter(option)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === option
                      ? 'bg-app-ink text-white'
                      : 'border border-app-line bg-white/75 text-app-ink hover:border-app-ink/20'
                  }`}
                >
                  {option === 'ALL' ? 'All' : option.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <MiniInsight
              label="Filtered results"
              value={filteredTasks.length}
              description="Tasks that match the active search and status."
            />
            <MiniInsight
              label="Page state"
              value={isPlaceholderData ? 'Syncing' : 'Fresh'}
              description="Whether React Query is serving placeholder data during paging."
            />
          </div>
        </SurfaceCard>

        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Task list</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Prioritized work</h2>
            </div>
            <div className="rounded-full bg-app-ink/5 px-3 py-1.5 text-xs font-semibold text-app-muted">
              {filteredTasks.length} shown
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[18rem] items-center justify-center">
              <Loader2 size={28} className="animate-spin text-app-accent" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No tasks match this view"
              description="Try another filter or create a task to start building the execution plan."
              action={
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
                >
                  Create task
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <TaskRow key={task.id} task={task} projectId={projectId!} />
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <PagingButton
              disabled={!data?.hasPreviousPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/tasks',
                  params: { projectId: projectId! },
                  search: {
                    cursor: data?.startCursor ?? undefined,
                    direction: 'backward',
                  },
                })
              }
            >
              Previous page
            </PagingButton>
            <PagingButton
              disabled={!data?.hasNextPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/tasks',
                  params: { projectId: projectId! },
                  search: {
                    cursor: data?.endCursor ?? undefined,
                    direction: 'forward',
                  },
                })
              }
            >
              Next page
            </PagingButton>
          </div>
        </SurfaceCardStrong>
      </div>

      <AppModal
        open={showCreate}
        title="Create a task"
        description="Capture the unit of work, then refine team assignment and dependency flow inside the task detail."
        onClose={() => setShowCreate(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            createTask.mutate();
          }}
        >
          <TextField label="Title" value={title} onChange={setTitle} placeholder="Write launch checklist" required />
          <TextAreaField label="Description" value={description} onChange={setDescription} placeholder="Describe the outcome and any key notes." />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTask.isPending || !title.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-60"
            >
              {createTask.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create task
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}

function TaskRow({ task, projectId }: { task: ProjectTask; projectId: string }) {
  return (
    <Link
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId, taskId: task.id }}
      className="block rounded-[24px] border border-app-line bg-white/75 p-4 transition hover:border-app-accent/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold text-app-ink">{task.title}</h3>
          <p className="mt-2 truncate-2 text-sm leading-6 text-app-muted">
            {task.description || 'No description added yet.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-app-muted">
        <span>{task.team?.name || 'No team assigned'}</span>
        <span>{task.assignedMember?.username || 'No assignee'}</span>
        <span>Updated {formatDate(task.updatedAt)}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-app-accent">
          Open details
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function MiniInsight({ label, value, description }: { label: string; value: string | number; description: string }) {
  return (
    <div className="rounded-2xl bg-app-ink/4 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-app-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-app-muted">{description}</p>
    </div>
  );
}

function PagingButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
