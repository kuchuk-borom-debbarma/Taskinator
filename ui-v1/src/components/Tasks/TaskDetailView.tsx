import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Copy, Loader2, Network, PencilLine, Plus, Save, Trash2, X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { ProjectTask, TaskLink } from '../../api/types';
import {
  AppModal,
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
import { PagingButton } from '../shared/PagingButton';

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
  const { taskApi, teamApi, projectApi } = useApi();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [priorityDraft, setPriorityDraft] = useState(0);
  const [teamIdDraft, setTeamIdDraft] = useState<string | null>(null);
  const [memberIdDraft, setMemberIdDraft] = useState<string | null>(null);

  const [incomingCursor, setIncomingCursor] = useState<string | undefined>();
  const [incomingDir, setIncomingDir] = useState<'forward' | 'backward'>('forward');
  const [outgoingCursor, setOutgoingCursor] = useState<string | undefined>();
  const [outgoingDir, setOutgoingDir] = useState<'forward' | 'backward'>('forward');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDescription, setQuickAddDescription] = useState('');
  const [quickAddLabel, setQuickAddLabel] = useState('blocks');
  const [customLabel, setCustomLabel] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [linkModalDir, setLinkModalDir] = useState<'incoming' | 'outgoing' | null>(null);
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const [existingTaskId, setExistingTaskId] = useState('');
  const [editingLink, setEditingLink] = useState<TaskLink | null>(null);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => taskApi.getTaskDetail(taskId),
  });

  const task = detail?.task;

  // Fetch project teams for dropdown
  const { data: teamsData } = useQuery({
    queryKey: ['project-teams-all', task?.project?.id],
    queryFn: () => teamApi.getTeams(task!.project!.id, { first: 100 }),
    enabled: !!task?.project?.id && isEditing,
  });

  // Fetch team members for dropdown
  const { data: membersData } = useQuery({
    queryKey: ['team-members-all', teamIdDraft],
    queryFn: () => teamApi.getTeamMembers(task!.project!.id, teamIdDraft!, { first: 100 }),
    enabled: !!task?.project?.id && !!teamIdDraft && isEditing,
  });

  const handleTeamChange = (newTeamId: string | null) => {
    setTeamIdDraft(newTeamId);
    if (!newTeamId) {
      setMemberIdDraft(null);
    }
  };

  const { data: incomingData, isLoading: incomingLoading } = useQuery({
    queryKey: ['task-links', taskId, 'incoming', incomingCursor, incomingDir],
    queryFn: () => {
      if (incomingDir === 'backward') {
        return taskApi.getTaskNeighbourLinks(taskId, 'incoming', 1, { last: 8, before: incomingCursor });
      }
      return taskApi.getTaskNeighbourLinks(taskId, 'incoming', 1, { first: 8, after: incomingDir === 'forward' ? incomingCursor : undefined });
    },
    enabled: !!incomingCursor, // Only run for pagination
    initialData: incomingCursor ? undefined : detail?.incoming,
  });

  const { data: outgoingData, isLoading: outgoingLoading } = useQuery({
    queryKey: ['task-links', taskId, 'outgoing', outgoingCursor, outgoingDir],
    queryFn: () => {
      if (outgoingDir === 'backward') {
        return taskApi.getTaskNeighbourLinks(taskId, 'outgoing', 1, { last: 8, before: outgoingCursor });
      }
      return taskApi.getTaskNeighbourLinks(taskId, 'outgoing', 1, { first: 8, after: outgoingDir === 'forward' ? outgoingCursor : undefined });
    },
    enabled: !!outgoingCursor, // Only run for pagination
    initialData: outgoingCursor ? undefined : detail?.outgoing,
  });

  const incoming = incomingData?.links || [];
  const outgoing = outgoingData?.links || [];

  const isLoading = detailLoading || (!!incomingCursor && (incomingLoading || outgoingLoading));

  const updateTask = useMutation({
    mutationFn: () => {
      if (!task) throw new Error('Task not loaded');
      return taskApi.updateTask(taskId, {
        projectId: task.project?.id || '',
        version: task.version,
        title: titleDraft.trim(),
        description: descriptionDraft.trim() || undefined,
        status: statusDraft || undefined,
        priority: priorityDraft,
        teamId: teamIdDraft,
        memberId: memberIdDraft,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['task', taskId], updated);
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', updated.project?.id] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', updated.project?.id] });
      setIsEditing(false);
    },
  });

  const quickAdd = useMutation({
    mutationFn: async () => {
      if (!task) throw new Error('Task not loaded');

      let targetId = existingTaskId.trim();

      if (addMode === 'new') {
        const newProjectTask = await taskApi.createTask({
          projectId: task.project?.id || '',
          title: quickAddTitle.trim(),
          description: quickAddDescription.trim() || `Quick dependency for ${task.title}`,
        });
        targetId = newProjectTask.id;
      }

      if (!targetId) throw new Error('Task ID is required');

      const finalLabel = quickAddLabel === 'other' ? customLabel.trim() : quickAddLabel;
      if (!finalLabel) throw new Error('Label is required');

      const isIncoming = linkModalDir === 'incoming';

      await taskApi.createTaskLink({
        projectId: task.project?.id || '',
        sourceTaskId: isIncoming ? targetId : taskId,
        targetTaskId: isIncoming ? taskId : targetId,
        label: finalLabel,
      });

      return { id: targetId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setQuickAddTitle('');
      setQuickAddDescription('');
      setCustomLabel('');
      setExistingTaskId('');
      setAddMode('new');
      setLinkModalDir(null);
      setIsQuickAdding(false);
    },
  });

  const updateLink = useMutation({
    mutationFn: (input: { linkId: string; label: string }) => 
      taskApi.updateTaskLink({
        projectId: task?.project?.id || '',
        linkId: input.linkId,
        label: input.label,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
      setEditingLink(null);
      setQuickAddLabel('blocks');
      setCustomLabel('');
    },
  });

  const deleteLink = useMutation({
    mutationFn: (linkId: string) => 
      taskApi.deleteTaskLink(task?.project?.id || '', linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-links', taskId] });
    },
  });

  if (isLoading) {
    return (
      <div className="page-frame">
        <LoadingPane title="Loading task details" message="Fetching task and dependency context." />
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
            <p className="eyebrow mb-3">Task</p>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-app-ink">{task.title}</h1>
          </div>
        </div>
      </SurfaceCardStrong>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <SurfaceCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Properties</h2>
            </div>
            <button
              onClick={() => {
                setTitleDraft(task.title);
                setDescriptionDraft(task.description);
                setStatusDraft(task.status);
                setPriorityDraft(task.priority);
                setTeamIdDraft(task.team?.id || null);
                setMemberIdDraft(task.assignedMember?.id || null);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              <PencilLine size={15} />
              Edit
            </button>
          </div>
          <div className="space-y-3 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <MetaItem label="Status">
                <StatusBadge status={task.status} />
              </MetaItem>
              <MetaItem label="Priority">
                <PriorityBadge priority={task.priority} />
              </MetaItem>
            </div>
            <MetaItem label="Assignee" value={task.assignedMember?.username || 'Unassigned'} />
            <MetaItem label="Team" value={task.team?.name || 'No team assigned'} />
            <MetaItem label="Project" value={task.project?.name || 'No project'} />
            <div className="grid grid-cols-2 gap-3">
              <MetaItem label="Created" value={formatDate(task.createdAt)} />
              <MetaItem label="Updated" value={formatDate(task.updatedAt)} />
            </div>
            <div className="rounded-2xl bg-app-ink/5 px-4 py-3 border border-app-line/50">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted mb-1.5">Task ID (UUID)</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs font-mono text-app-muted truncate select-all">{taskId}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(taskId);
                    // Could add a toast here if available
                  }}
                  className="rounded-lg p-1.5 hover:bg-app-ink/5 text-app-muted transition-colors"
                  title="Copy ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCardStrong className="p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Description</h2>
              </div>
            </div>
            <p className="text-sm leading-7 text-app-muted whitespace-pre-wrap">
              {task.description || 'No description provided.'}
            </p>
          </SurfaceCardStrong>

          <SurfaceCardStrong className="p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Links</h2>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <DependencyCard
                title="Incoming"
                links={incoming}
                direction="incoming"
                description="Tasks that impact this task."
                onAdd={() => {
                  setLinkModalDir('incoming');
                  setQuickAddLabel('blocks');
                }}
                onEdit={(link) => {
                  setEditingLink(link);
                  const commonLabels = ['blocks', 'parent of', 'duplicates', 'relates to'];
                  if (commonLabels.includes(link.label)) {
                    setQuickAddLabel(link.label);
                    setCustomLabel('');
                  } else {
                    setQuickAddLabel('other');
                    setCustomLabel(link.label);
                  }
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to remove this link?')) {
                    deleteLink.mutate(id);
                  }
                }}
                pageData={{
                  hasNextPage: incomingData?.pageInfo?.hasNextPage ?? false,
                  hasPreviousPage: incomingData?.pageInfo?.hasPreviousPage ?? false,
                }}
                onNext={() => {
                  setIncomingCursor(incomingData?.pageInfo?.endCursor ?? undefined);
                  setIncomingDir('forward');
                }}
                onPrev={() => {
                  setIncomingCursor(incomingData?.pageInfo?.startCursor ?? undefined);
                  setIncomingDir('backward');
                }}
              />
              <DependencyCard
                title="Outgoing"
                links={outgoing}
                direction="outgoing"
                description="Tasks that this task depends on."
                onAdd={() => {
                  setLinkModalDir('outgoing');
                  setQuickAddLabel('blocked by');
                }}
                onEdit={(link) => {
                  setEditingLink(link);
                  const commonLabels = ['blocks', 'parent of', 'duplicates', 'relates to'];
                  if (commonLabels.includes(link.label)) {
                    setQuickAddLabel(link.label);
                    setCustomLabel('');
                  } else {
                    setQuickAddLabel('other');
                    setCustomLabel(link.label);
                  }
                }}
                onDelete={(id) => {
                  if (confirm('Are you sure you want to remove this link?')) {
                    deleteLink.mutate(id);
                  }
                }}
                pageData={{
                  hasNextPage: outgoingData?.pageInfo?.hasNextPage ?? false,
                  hasPreviousPage: outgoingData?.pageInfo?.hasPreviousPage ?? false,
                }}
                onNext={() => {
                  setOutgoingCursor(outgoingData?.pageInfo?.endCursor ?? undefined);
                  setOutgoingDir('forward');
                }}
                onPrev={() => {
                  setOutgoingCursor(outgoingData?.pageInfo?.startCursor ?? undefined);
                  setOutgoingDir('backward');
                }}
              />
            </div>
          </SurfaceCardStrong>
        </div>
      </div>

      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/30 p-4 backdrop-blur-sm md:items-center">
          <button className="absolute inset-0 cursor-default" aria-label="Close editor" onClick={() => setIsEditing(false)} />
          <div className="surface-card-strong relative z-10 w-full max-w-xl rounded-[28px] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Edit task</h2>
                <p className="mt-2 text-sm leading-6 text-app-muted">Update task details and assignments.</p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-app-line p-2 text-app-muted transition hover:border-app-ink/20 hover:text-app-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <TextField label="Title" value={titleDraft} onChange={setTitleDraft} />
              <TextAreaField label="Description" value={descriptionDraft} onChange={setDescriptionDraft} rows={4} />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">Status</p>
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value)}
                    className="w-full rounded-xl border border-app-line bg-white/50 px-3 py-2 text-sm outline-none shadow-sm cursor-pointer"
                  >
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELED">Canceled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">Priority</p>
                  <select
                    value={priorityDraft}
                    onChange={(e) => setPriorityDraft(Number(e.target.value))}
                    className="w-full rounded-xl border border-app-line bg-white/50 px-3 py-2 text-sm outline-none shadow-sm cursor-pointer"
                  >
                    <option value={0}>Urgent (P0)</option>
                    <option value={1}>High (P1)</option>
                    <option value={2}>Medium (P2)</option>
                    <option value={3}>Low (P3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">Assign Team</p>
                  <select
                    value={teamIdDraft || ''}
                    onChange={(e) => handleTeamChange(e.target.value || null)}
                    className="w-full rounded-xl border border-app-line bg-white/50 px-3 py-2 text-sm outline-none shadow-sm cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teamsData?.teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">Assign Member</p>
                  <select
                    value={memberIdDraft || ''}
                    onChange={(e) => setMemberIdDraft(e.target.value || null)}
                    disabled={!teamIdDraft}
                    className="w-full rounded-xl border border-app-line bg-white/50 px-3 py-2 text-sm outline-none shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <option value="">No member assigned</option>
                    {membersData?.members.map(m => (
                      <option key={m.id} value={m.id}>{m.username}</option>
                    ))}
                  </select>
                  {!teamIdDraft && <p className="text-[10px] text-app-muted">Assign a team first to pick a member.</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-app-line">
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

      <AppModal
        open={!!linkModalDir}
        title={linkModalDir === 'incoming' ? 'Add incoming link' : 'Add outgoing link'}
        description="Define a relationship between tasks."
        onClose={() => setLinkModalDir(null)}
      >
        <div className="space-y-4">
          <div className="flex rounded-2xl bg-app-ink/5 p-1">
            <button
              onClick={() => setAddMode('new')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                addMode === 'new' ? 'bg-white text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink'
              }`}
            >
              New Task
            </button>
            <button
              onClick={() => setAddMode('existing')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                addMode === 'existing' ? 'bg-white text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink'
              }`}
            >
              Existing ID
            </button>
          </div>

          {addMode === 'new' ? (
            <>
              <TextField label="New task title" value={quickAddTitle} onChange={setQuickAddTitle} placeholder="What needs to be done?" />
              <TextAreaField label="Description" value={quickAddDescription} onChange={setQuickAddDescription} placeholder="Optional context..." rows={3} />
            </>
          ) : (
            <TextField label="Existing Task ID" value={existingTaskId} onChange={setExistingTaskId} placeholder="Paste UUID here..." />
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">Relationship</p>
            <select
              value={quickAddLabel}
              onChange={(e) => setQuickAddLabel(e.target.value)}
              className="w-full rounded-xl border border-app-line bg-white/50 px-3 py-2 text-sm outline-none shadow-sm cursor-pointer"
            >
              {linkModalDir === 'incoming' ? (
                <>
                  <option value="blocks">New task blocks this task</option>
                  <option value="parent of">New task is parent of this task</option>
                  <option value="duplicates">New task duplicates this task</option>
                  <option value="relates to">New task relates to this task</option>
                </>
              ) : (
                <>
                  <option value="blocked by">This task is blocked by new task</option>
                  <option value="sub-task of">This task is a sub-task of new task</option>
                  <option value="duplicates">This task duplicates new task</option>
                  <option value="relates to">This task relates to new task</option>
                </>
              )}
              <option value="other">Other...</option>
            </select>
          </div>

          {quickAddLabel === 'other' && (
            <TextField label="Custom label" value={customLabel} onChange={setCustomLabel} placeholder="e.g. validates" />
          )}

          <div className="rounded-2xl bg-app-accent/5 p-4 border border-app-accent/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent mb-3">Relationship Preview</p>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1 rounded-xl bg-white px-3 py-2 border border-app-line text-app-ink font-medium truncate">
                {linkModalDir === 'incoming' 
                  ? (addMode === 'new' ? (quickAddTitle || 'New task') : (existingTaskId || 'Target ID'))
                  : (task.title)}
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                <span className="text-[10px] font-bold text-app-accent uppercase tracking-tighter">
                  {quickAddLabel === 'other' ? (customLabel || '...') : quickAddLabel}
                </span>
                <div className="h-[2px] w-8 bg-app-accent/30 rounded-full" />
              </div>
              <div className="flex-1 rounded-xl bg-white px-3 py-2 border border-app-line text-app-ink font-medium truncate">
                {linkModalDir === 'incoming' 
                  ? (task.title)
                  : (addMode === 'new' ? (quickAddTitle || 'New task') : (existingTaskId || 'Target ID'))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-app-line">
            <button
              onClick={() => setLinkModalDir(null)}
              className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              Cancel
            </button>
            <button
              disabled={
                quickAdd.isPending ||
                (addMode === 'new' && !quickAddTitle.trim()) ||
                (addMode === 'existing' && !existingTaskId.trim()) ||
                (quickAddLabel === 'other' && !customLabel.trim())
              }
              onClick={() => quickAdd.mutate()}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-50"
            >
              {quickAdd.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
              {addMode === 'new' ? 'Create & link task' : 'Link existing task'}
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={!!editingLink}
        title="Edit link relationship"
        description={`Update how this task relates to "${editingLink?.source?.id === taskId ? editingLink?.target?.title : editingLink?.source?.title}"`}
        onClose={() => setEditingLink(null)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">Relationship</p>
            <select
              value={quickAddLabel}
              onChange={(e) => setQuickAddLabel(e.target.value)}
              className="w-full rounded-xl border border-app-line bg-white/50 px-3 py-2 text-sm outline-none shadow-sm cursor-pointer"
            >
              {editingLink?.target?.id === taskId ? (
                <>
                  <option value="blocks">New task blocks this task</option>
                  <option value="parent of">New task is parent of this task</option>
                  <option value="duplicates">New task duplicates this task</option>
                  <option value="relates to">New task relates to this task</option>
                </>
              ) : (
                <>
                  <option value="blocked by">This task is blocked by new task</option>
                  <option value="sub-task of">This task is a sub-task of new task</option>
                  <option value="duplicates">This task duplicates new task</option>
                  <option value="relates to">This task relates to new task</option>
                </>
              )}
              <option value="other">Other...</option>
            </select>
          </div>

          {quickAddLabel === 'other' && (
            <TextField label="Custom label" value={customLabel} onChange={setCustomLabel} placeholder="e.g. validates" />
          )}

          <div className="rounded-2xl bg-app-accent/5 p-4 border border-app-accent/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent mb-3">Relationship Preview</p>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1 rounded-xl bg-white px-3 py-2 border border-app-line text-app-ink font-medium truncate">
                {editingLink?.target?.id === taskId 
                  ? (editingLink?.source?.title || 'Source Task')
                  : (task.title)}
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                <span className="text-[10px] font-bold text-app-accent uppercase tracking-tighter">
                  {quickAddLabel === 'other' ? (customLabel || '...') : quickAddLabel}
                </span>
                <div className="h-[2px] w-8 bg-app-accent/30 rounded-full" />
              </div>
              <div className="flex-1 rounded-xl bg-white px-3 py-2 border border-app-line text-app-ink font-medium truncate">
                {editingLink?.target?.id === taskId 
                  ? (task.title)
                  : (editingLink?.target?.title || 'Target Task')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-app-line">
            <button
              onClick={() => setEditingLink(null)}
              className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              Cancel
            </button>
            <button
              disabled={updateLink.isPending || (quickAddLabel === 'other' && !customLabel.trim())}
              onClick={() => {
                if (!editingLink) return;
                const finalLabel = quickAddLabel === 'other' ? customLabel.trim() : quickAddLabel;
                updateLink.mutate({ linkId: editingLink.id, label: finalLabel });
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-50"
            >
              {updateLink.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
              Save changes
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

function MetaItem({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-app-accent/10 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">{label}</p>
      <div className="mt-2 text-sm font-medium text-app-ink flex items-center">{value || children}</div>
    </div>
  );
}

function DependencyCard({
  title,
  links,
  direction,
  description,
  pageData,
  onAdd,
  onEdit,
  onDelete,
  onNext,
  onPrev,
}: {
  title: string;
  links: TaskLink[];
  direction: 'incoming' | 'outgoing';
  description: string;
  pageData: { hasNextPage: boolean; hasPreviousPage: boolean };
  onAdd: () => void;
  onEdit: (link: TaskLink) => void;
  onDelete: (id: string) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const groupedLinks = links.reduce((acc, link) => {
    const label = link.label || 'Unlabeled';
    if (!acc[label]) acc[label] = [];
    acc[label].push(link);
    return acc;
  }, {} as Record<string, TaskLink[]>);

  return (
    <SurfaceCard className="flex flex-col p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">{title}</p>
        <button
          onClick={onAdd}
          className="rounded-full border border-app-line p-1.5 text-app-muted transition hover:border-app-ink/20 hover:text-app-ink"
          title={`Add ${title.toLowerCase()} link`}
        >
          <Plus size={14} />
        </button>
      </div>
      <p className="mb-5 text-[11px] leading-relaxed text-app-muted/80">{description}</p>
      <div className="flex-1 space-y-6">
        {links.length === 0 ? null : (
          Object.entries(groupedLinks).map(([label, groupLinks]) => (
            <div key={label} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">{label}</p>
              {groupLinks.map((link) => {
                const task = direction === 'incoming' ? link.source : link.target;
                return (
                  <div key={link.id} className="group relative rounded-[22px] border border-app-line bg-white/75 px-4 py-4 transition hover:border-app-accent/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-app-ink">{task.title}</p>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={task.status} />
                        <div className="flex scale-90 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => onEdit(link)}
                            className="rounded-lg p-1 text-app-muted hover:bg-app-ink/5 hover:text-app-ink"
                            title="Edit link"
                          >
                            <PencilLine size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(link.id)}
                            className="rounded-lg p-1 text-app-muted hover:bg-red-50 hover:text-red-500"
                            title="Remove link"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-app-muted">{task.team?.name || 'No team assigned'}</p>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-app-line pt-6">
        <PagingButton disabled={!pageData.hasPreviousPage} onClick={onPrev}>
          <ArrowLeft size={14} />
          Prev
        </PagingButton>
        <PagingButton disabled={!pageData.hasNextPage} onClick={onNext}>
          Next
          <ArrowRight size={14} />
        </PagingButton>
      </div>
    </SurfaceCard>
  );
}

