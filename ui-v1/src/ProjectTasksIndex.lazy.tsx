import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Filter, FolderKanban, Loader2, Plus, Search } from 'lucide-react';
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
import { PagingButton } from './components/shared/PagingButton';
import { CONFIG } from './config';

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
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');
  const [priority, setPriority] = useState(2);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', projectId, cursor, direction],
    queryFn: () => {
      if (direction === 'backward') {
        return taskApi.getTasks(projectId!, { last: CONFIG.PAGINATION.TASKS_LIST, before: cursor });
      }
      return taskApi.getTasks(projectId!, {
        first: CONFIG.PAGINATION.TASKS_LIST,
        after: direction === 'forward' ? cursor : undefined,
      });
    },
    enabled: !!projectId,
    placeholderData: (previous) => previous,
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  const createTask = useMutation({
    mutationFn: () => taskApi.createTask({
      projectId: projectId!,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
    }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      queryClient.setQueryData(['task', task.id], task);
      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['task-detail', task.id] });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      }, 750);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setPriority(2);
      navigate({ to: '/projects/$projectId/tasks/$taskId', params: { projectId: projectId!, taskId: task.id } });
    },
  });

  const filteredTasks = useMemo(() => {
    const tasks = data?.tasks ?? [];
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
  }, [data?.tasks, query, statusFilter]);

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


        </SurfaceCard>

        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Task list</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Prioritized work</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-full bg-app-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-accent/90"
              >
                <Plus size={16} />
                Create task
              </button>
              <div className="rounded-full bg-app-ink/5 px-3 py-1.5 text-xs font-semibold text-app-muted">
                {filteredTasks.length} shown
              </div>
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

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-app-line pt-6">
            <PagingButton
              disabled={!data?.pageInfo.hasPreviousPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/tasks',
                  params: { projectId: projectId! },
                  search: {
                    cursor: data?.pageInfo.startCursor ?? undefined,
                    direction: 'backward',
                  },
                })
              }
            >
              <ArrowLeft size={14} />
              Prev
            </PagingButton>
            <PagingButton
              disabled={!data?.pageInfo.hasNextPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/tasks',
                  params: { projectId: projectId! },
                  search: {
                    cursor: data?.pageInfo.endCursor ?? undefined,
                    direction: 'forward',
                  },
                })
              }
            >
              Next
              <ArrowRight size={14} />
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
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-app-ink">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
                className="w-full rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
              >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-app-ink">Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
                className="w-full rounded-2xl border border-app-line bg-white/85 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
              >
                <option value={0}>Urgent</option>
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </label>
          </div>
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
