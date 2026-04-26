import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Network, PencilLine, Save, X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { ProjectTask } from '../../api/types';
import {
  EmptyState,
  LoadingPane,
  PriorityBadge,
  StatusBadge,
  SurfaceCard,
  SurfaceCardStrong,
  TextAreaField,
  TextField,
  formatDate,
} from '../shared/workspace';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

const getCachedTask = (queryClient: QueryClient, taskId: string) => {
  const direct = queryClient.getQueryData<ProjectTask>(['task', taskId]);
  if (direct) return direct;

  const taskPages = queryClient.getQueriesData<{ tasks: ProjectTask[] }>({ queryKey: ['tasks'] });
  for (const [, page] of taskPages) {
    const match = page?.tasks?.find((task) => task.id === taskId);
    if (match) return match;
  }
  return undefined;
};

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
    initialData: () => getCachedTask(queryClient, taskId),
    staleTime: 1000 * 60 * 10,
  });

  const { data: incomingData } = useQuery({
    queryKey: ['task-links', taskId, 'incoming'],
    queryFn: () => taskApi.getTaskNeighbourLinks(taskId, 'incoming', 1, 8),
    enabled: !!task,
    staleTime: 1000 * 60 * 3,
  });

  const { data: outgoingData } = useQuery({
    queryKey: ['task-links', taskId, 'outgoing'],
    queryFn: () => taskApi.getTaskNeighbourLinks(taskId, 'outgoing', 1, 8),
    enabled: !!task,
    staleTime: 1000 * 60 * 3,
  });

  const updateTask = useMutation({
    mutationFn: () => {
      if (!task) throw new Error('Task not loaded');
      return taskApi.updateTask(taskId, {
        projectId: task.project?.id || '',
        version: task.version,
        title: titleDraft.trim(),
        description: descriptionDraft.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['task', taskId], updated);
      queryClient.invalidateQueries({ queryKey: ['tasks', updated.project?.id] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', updated.project?.id] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="page-frame">
        <LoadingPane title="Loading task details" message="Pulling the latest task and dependency context." />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-frame">
        <EmptyState icon={Network} title="Task not found" description="We could not load this task right now." />
      </div>
    );
  }

  const incoming = incomingData?.links ?? [];
  const outgoing = outgoingData?.links ?? [];

  return (
    <div className="page-frame">
      <SurfaceCardStrong className="hero-gradient p-6 md:p-8">
        <div className="mb-5 flex flex-wrap gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            <ArrowLeft size={15} />
            Back to tasks
          </button>
          <Link
            to="/graph/$projectId"
            params={{ projectId: task.project?.id || '' }}
            search={{ taskId }}
            className="inline-flex items-center gap-2 rounded-full bg-app-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-ink/92"
          >
            <Network size={15} />
            Open flow map
          </Link>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="eyebrow mb-3">Task detail</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-app-ink">{task.title}</h1>
            <p className="mt-3 text-base leading-7 text-app-muted">
              Full task context now lives in one view: identity, ownership, description, and dependency signal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </SurfaceCardStrong>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <SurfaceCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-2">Meta</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Task facts</h2>
            </div>
            <button
              onClick={() => {
                setTitleDraft(task.title);
                setDescriptionDraft(task.description);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              <PencilLine size={15} />
              Edit
            </button>
          </div>
          <MetaItem label="Project" value={task.project?.name || 'No project'} />
          <MetaItem label="Team" value={task.team?.name || 'No team assigned'} />
          <MetaItem label="Assignee" value={task.assignedMember?.username || 'No assignee'} />
          <MetaItem label="Created" value={formatDate(task.createdAt)} />
          <MetaItem label="Updated" value={formatDate(task.updatedAt)} />
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCardStrong className="p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Description</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">What this task is about</h2>
              </div>
            </div>
            <p className="text-sm leading-7 text-app-muted whitespace-pre-wrap">
              {task.description || 'No description has been added yet.'}
            </p>
          </SurfaceCardStrong>

          <div className="grid gap-6 lg:grid-cols-2">
            <DependencyCard
              title="Blocked by"
              description="Tasks that need to land before this one can move cleanly."
              tasks={incoming.map((link) => link.source)}
            />
            <DependencyCard
              title="Unblocks"
              description="Tasks that this work enables or affects downstream."
              tasks={outgoing.map((link) => link.target)}
            />
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/30 p-4 backdrop-blur-sm md:items-center">
          <button className="absolute inset-0 cursor-default" aria-label="Close editor" onClick={() => setIsEditing(false)} />
          <div className="surface-card-strong relative z-10 w-full max-w-xl rounded-[28px] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Edit task</h2>
                <p className="mt-2 text-sm leading-6 text-app-muted">Keep the task crisp. Title states the outcome; description adds context.</p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-app-line p-2 text-app-muted transition hover:border-app-ink/20 hover:text-app-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <TextField label="Title" value={titleDraft} onChange={setTitleDraft} />
              <TextAreaField label="Description" value={descriptionDraft} onChange={setDescriptionDraft} rows={6} />
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateTask.mutate()}
                  disabled={updateTask.isPending || !titleDraft.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-60"
                >
                  {updateTask.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-app-ink/4 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">{label}</p>
      <p className="mt-2 text-sm font-medium text-app-ink">{value}</p>
    </div>
  );
}

function DependencyCard({
  title,
  description,
  tasks,
}: {
  title: string;
  description: string;
  tasks: ProjectTask[];
}) {
  return (
    <SurfaceCard className="p-5">
      <p className="eyebrow mb-2">{title}</p>
      <p className="mb-4 text-sm leading-6 text-app-muted">{description}</p>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-sm leading-6 text-app-muted">No linked tasks in this direction yet.</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="rounded-[22px] border border-app-line bg-white/75 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-app-ink">{task.title}</p>
                <StatusBadge status={task.status} />
              </div>
              <p className="mt-2 text-xs text-app-muted">{task.team?.name || 'No team assigned'}</p>
            </div>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}
