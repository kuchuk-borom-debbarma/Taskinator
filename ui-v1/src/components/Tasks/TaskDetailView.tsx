import { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Copy, Loader2, Network, PencilLine, Plus, Save, Trash2, X, AlertTriangle, ShieldAlert, MessageSquare, Calendar, CheckCircle2, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { TaskLink, TaskStatus, TaskPriority } from '../../api/types';
import {
  AppModal,
  CustomFormSelect,
  CustomInlineSelect,
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
import { TaskGraphView } from './TaskGraphView';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi, teamApi } = useApi();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<TaskStatus>('');
  const [priorityDraft, setPriorityDraft] = useState<TaskPriority>(0);
  const [teamIdDraft, setTeamIdDraft] = useState<string | null>(null);
  const [memberIdDraft, setMemberIdDraft] = useState<string | null>(null);
  const [dueDateDraft, setDueDateDraft] = useState<string>('');
  const [sliderDelayDays, setSliderDelayDays] = useState(0);

  const [inlineDraft, setInlineDraft] = useState<{
    status: TaskStatus;
    priority: TaskPriority;
    teamId: string | null;
    memberId: string | null;
    dueDate: string | null;
  }>({
    status: '',
    priority: 0,
    teamId: null,
    memberId: null,
    dueDate: null,
  });
  const [activeInlineField, setActiveInlineField] = useState<string | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inlineUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [incomingCursor, setIncomingCursor] = useState<string | undefined>();
  const [incomingDir, setIncomingDir] = useState<'forward' | 'backward'>('forward');
  const [outgoingCursor, setOutgoingCursor] = useState<string | undefined>();
  const [outgoingDir, setOutgoingDir] = useState<'forward' | 'backward'>('forward');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDescription, setQuickAddDescription] = useState('');
  const [quickAddLabel, setQuickAddLabel] = useState('blocks');
  const [customLabel, setCustomLabel] = useState('');
  const [linkModalDir, setLinkModalDir] = useState<'incoming' | 'outgoing' | null>(null);
  const [addMode, setAddMode] = useState<'new' | 'existing'>('new');
  const [existingTaskId, setExistingTaskId] = useState('');
  const [editingLink, setEditingLink] = useState<TaskLink | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => taskApi.getTaskDetail(taskId),
  });

  const task = detail?.task;

  const { data: simulatedSlips, isLoading: simulationLoading } = useQuery({
    queryKey: ['slippage-simulation', taskId, sliderDelayDays],
    queryFn: () => taskApi.simulateSlippage(task!.project!.id, taskId, sliderDelayDays),
    enabled: !!task?.project?.id && sliderDelayDays > 0,
  });

  // Fetch project teams for dropdown
  const { data: teamsData } = useQuery({
    queryKey: ['project-teams-all', task?.project?.id],
    queryFn: () => teamApi.getTeams(task!.project!.id, { first: 100 }),
    enabled: !!task?.project?.id,
  });

  // Fetch team members for dropdown
  const currentTeamId = activeInlineField ? inlineDraft.teamId : (teamIdDraft || task?.team?.id);
  const { data: membersData } = useQuery({
    queryKey: ['team-members-all', currentTeamId],
    queryFn: () => teamApi.getTeamMembers(task!.project!.id, currentTeamId!, { first: 100 }),
    enabled: !!task?.project?.id && !!currentTeamId,
  });

  // Comments and Activity Logs Local States
  const [taskTab, setTaskTab] = useState<'comments' | 'activity'>('comments');
  const [commentCursor, setCommentCursor] = useState<string | null>(null);
  const [commentCursorHistory, setCommentCursorHistory] = useState<string[]>([]);
  const [logCursor, setLogCursor] = useState<string | null>(null);
  const [logCursorHistory, setLogCursorHistory] = useState<string[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['task-comments', taskId, commentCursor],
    queryFn: () => taskApi.getTaskComments(taskId, commentCursor ? { first: 6, after: commentCursor } : { first: 6 }),
    enabled: !!task,
  });

  // Fetch activity logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['task-logs', taskId, logCursor],
    queryFn: () => taskApi.getTaskActivityLogs(taskId, logCursor ? { first: 8, after: logCursor } : { first: 8 }),
    enabled: !!task,
  });

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: (content: string) => taskApi.addComment(taskId, content),
    onSuccess: () => {
      setCommentDraft('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: (input: { commentId: string; content: string; version: number }) =>
      taskApi.updateComment(input.commentId, input.content, input.version),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditCommentDraft('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => taskApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });

  useEffect(() => {
    if (task) {
      setInlineDraft({
        status: task.status,
        priority: task.priority,
        teamId: task.team?.id || null,
        memberId: task.assignedMember?.id || null,
        dueDate: task.dueDate || null,
      });
    }
  }, [task]);

  const handleInlineChange = (changes: Partial<typeof inlineDraft>) => {
    const next = { ...inlineDraft, ...changes };
    setInlineDraft(next);
    setActiveInlineField(null);
    setIsDebouncing(true);

    if (inlineUpdateTimeout.current) clearTimeout(inlineUpdateTimeout.current);
    
    inlineUpdateTimeout.current = setTimeout(() => {
      setIsDebouncing(false);
      setIsSaving(true);
      taskApi.updateTask(taskId, {
        projectId: task!.project!.id,
        version: task!.version,
        title: task!.title,
        description: task!.description,
        status: next.status,
        priority: next.priority,
        teamId: next.teamId,
        memberId: next.memberId,
        dueDate: next.dueDate,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks', task!.project?.id] });
        queryClient.invalidateQueries({ queryKey: ['project-dashboard', task!.project?.id] });
      }).catch(err => {
        console.error('Failed to inline update task:', err);
      }).finally(() => {
        setIsSaving(false);
      });
    }, 5000);
  };

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

  const incomingSource = incomingCursor ? incomingData : detail?.incoming;
  const outgoingSource = outgoingCursor ? outgoingData : detail?.outgoing;
  const incoming = incomingSource?.links || [];
  const outgoing = outgoingSource?.links || [];

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
        dueDate: dueDateDraft ? new Date(dueDateDraft).toISOString() : null,
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

  const deleteTask = useMutation({
    mutationFn: () => {
      if (!task?.project?.id) throw new Error('Project not loaded');
      return taskApi.deleteTask(task.project.id, taskId);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['task-detail', taskId] });
      queryClient.removeQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task?.project?.id] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', task?.project?.id] });
      onClose();
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
          <button
            onClick={() => setIsGraphModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-app-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-app-ink/92"
          >
            <Network size={15} />
            Open flow map
          </button>
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
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Properties</h2>
              {(isDebouncing || isSaving) && (
                <div className="flex items-center gap-1.5 rounded-full bg-app-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-app-accent">
                  {isSaving ? (
                    <><Loader2 size={12} className="animate-spin" /> Saving...</>
                  ) : (
                    <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span></span> Waiting to save...</>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setTitleDraft(task.title);
                setDescriptionDraft(task.description);
                setStatusDraft(task.status);
                setPriorityDraft(task.priority);
                setTeamIdDraft(task.team?.id || null);
                setMemberIdDraft(task.assignedMember?.id || null);
                setDueDateDraft(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              <PencilLine size={15} />
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this task and its links?')) deleteTask.mutate();
              }}
              disabled={deleteTask.isPending}
              className="ml-2 inline-flex items-center gap-2 rounded-full border border-app-danger/20 bg-app-danger/10 px-4 py-2 text-sm font-semibold text-app-danger transition hover:bg-app-danger/15 disabled:opacity-60"
            >
              {deleteTask.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Delete
            </button>
          </div>
          <div className="space-y-3 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <MetaItem 
                label="Status"
                isEditing={activeInlineField === 'status'}
                onEditClick={() => setActiveInlineField('status')}
                editNode={
                  <CustomInlineSelect
                    value={inlineDraft.status}
                    onChange={(val) => handleInlineChange({ status: val })}
                    onClose={() => setActiveInlineField(null)}
                    options={[
                      { label: 'Todo', value: 'TODO' },
                      { label: 'In Progress', value: 'IN_PROGRESS' },
                      { label: 'Done', value: 'DONE' },
                      { label: 'Canceled', value: 'CANCELED' },
                    ]}
                  />
                }
              >
                <StatusBadge status={inlineDraft.status || task.status} />
              </MetaItem>
              <MetaItem 
                label="Priority"
                isEditing={activeInlineField === 'priority'}
                onEditClick={() => setActiveInlineField('priority')}
                editNode={
                  <CustomInlineSelect
                    type="number"
                    value={inlineDraft.priority}
                    onChange={(val) => handleInlineChange({ priority: val })}
                    onClose={() => setActiveInlineField(null)}
                    options={[
                      { label: 'Urgent (P0)', value: 0 },
                      { label: 'High (P1)', value: 1 },
                      { label: 'Medium (P2)', value: 2 },
                      { label: 'Low (P3)', value: 3 },
                    ]}
                  />
                }
              >
                <PriorityBadge priority={inlineDraft.priority ?? task.priority} />
              </MetaItem>
            </div>
            <MetaItem 
              label="Assignee" 
              isEditing={activeInlineField === 'assignee'}
              onEditClick={() => setActiveInlineField('assignee')}
              editNode={
                <select
                  autoFocus
                  value={inlineDraft.memberId || ''}
                  onChange={(e) => handleInlineChange({ memberId: e.target.value || null })}
                  onBlur={() => setActiveInlineField(null)}
                  disabled={!inlineDraft.teamId}
                  className="w-full rounded-xl border border-app-line bg-white/50 px-2 py-1.5 text-sm outline-none shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {membersData?.members.map(m => (
                    <option key={m.id} value={m.user?.id}>{m.user?.username || m.user?.id}</option>
                  ))}
                </select>
              }
            >
              {inlineDraft.memberId 
                ? (membersData?.members.find(m => m.user?.id === inlineDraft.memberId)?.user?.username || 'Loading...') 
                : (task.assignedMember?.username || 'Unassigned')}
            </MetaItem>
            <MetaItem 
              label="Team" 
              isEditing={activeInlineField === 'team'}
              onEditClick={() => setActiveInlineField('team')}
              editNode={
                <select
                  autoFocus
                  value={inlineDraft.teamId || ''}
                  onChange={(e) => handleInlineChange({ teamId: e.target.value || null, memberId: null })}
                  onBlur={() => setActiveInlineField(null)}
                  className="w-full rounded-xl border border-app-line bg-white/50 px-2 py-1.5 text-sm outline-none shadow-sm cursor-pointer"
                >
                  <option value="">No team</option>
                  {teamsData?.teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              }
            >
              {inlineDraft.teamId 
                ? (teamsData?.teams.find(t => t.id === inlineDraft.teamId)?.name || 'Loading...') 
                : (task.team?.name || 'No team assigned')}
            </MetaItem>
            <MetaItem label="Project" value={task.project?.name || 'No project'} />
            <MetaItem
              label="Due Date"
              isEditing={activeInlineField === 'dueDate'}
              onEditClick={() => setActiveInlineField('dueDate')}
              editNode={
                <input
                  type="date"
                  autoFocus
                  value={inlineDraft.dueDate ? inlineDraft.dueDate.split('T')[0] : ''}
                  onChange={(e) => handleInlineChange({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  onBlur={() => setActiveInlineField(null)}
                  className="w-full rounded-xl border border-app-line bg-white/50 px-2 py-1.5 text-sm outline-none shadow-sm cursor-pointer"
                />
              }
            >
              {inlineDraft.dueDate ? formatDate(inlineDraft.dueDate) : (task.dueDate ? formatDate(task.dueDate) : 'No due date')}
            </MetaItem>
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
          <SurfaceCardStrong className="p-5 md:p-6 space-y-6">
            {/* Tab Selector */}
            <div className="flex border-b border-app-line/60">
              <button
                onClick={() => setTaskTab('comments')}
                className={`pb-3 text-sm font-semibold tracking-wide border-b-2 px-4 transition-all duration-300 ${
                  taskTab === 'comments' ? 'border-app-accent text-app-accent' : 'border-transparent text-app-muted hover:text-app-ink'
                }`}
              >
                Comments
              </button>
              <button
                onClick={() => setTaskTab('activity')}
                className={`pb-3 text-sm font-semibold tracking-wide border-b-2 px-4 transition-all duration-300 ${
                  taskTab === 'activity' ? 'border-app-accent text-app-accent' : 'border-transparent text-app-muted hover:text-app-ink'
                }`}
              >
                Activity Log
              </button>
            </div>

            {/* Comments Tab View */}
            {taskTab === 'comments' && (
              <div className="space-y-6">
                {/* Add Comment Input Form */}
                <div className="space-y-3">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Add a comment... (Markdown not parsed yet, but supported)"
                    rows={3}
                    className="w-full rounded-2xl border border-app-line bg-white/60 px-4 py-3 text-sm outline-none shadow-sm focus:border-app-accent/50 focus:bg-white transition-all duration-300 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => addCommentMutation.mutate(commentDraft)}
                      disabled={!commentDraft.trim() || addCommentMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-2.5 text-xs font-bold text-white transition hover:bg-app-accent/90 disabled:opacity-50 shadow-sm shadow-app-accent/10"
                    >
                      {addCommentMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Comments Stream */}
                <div className="space-y-4">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-8 text-app-muted text-sm gap-2">
                      <Loader2 size={16} className="animate-spin" /> Loading comments...
                    </div>
                  ) : commentsData?.comments.length === 0 ? (
                    <div className="text-center py-8 text-sm text-app-muted border border-dashed border-app-line rounded-2xl bg-app-ink/2">
                      No comments yet. Start the conversation!
                    </div>
                  ) : (
                    commentsData?.comments.map((comment) => (
                      <div key={comment.id} className="group relative rounded-2xl border border-app-line bg-white/50 px-4 py-4 transition hover:bg-white hover:border-app-accent/20 hover:shadow-md hover:shadow-app-ink/2 duration-300">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-app-accent/10 text-xs font-bold text-app-accent uppercase">
                              {comment.author.username.substring(0, 2)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-app-ink">{comment.author.username}</span>
                              <span className="text-[10px] text-app-muted ml-2">{formatDate(comment.createdAt)}</span>
                            </div>
                          </div>
                          
                          {/* Owner Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditCommentDraft(comment.content);
                              }}
                              className="rounded p-1 text-app-muted hover:bg-app-ink/5 hover:text-app-accent transition-colors"
                              title="Edit comment"
                            >
                              <PencilLine size={12} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this comment?')) {
                                  deleteCommentMutation.mutate(comment.id);
                                }
                              }}
                              className="rounded p-1 text-app-muted hover:bg-app-danger/10 hover:text-app-danger transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="space-y-3 mt-2">
                            <textarea
                              value={editCommentDraft}
                              onChange={(e) => setEditCommentDraft(e.target.value)}
                              rows={2}
                              className="w-full rounded-xl border border-app-line bg-white px-3 py-2 text-sm outline-none shadow-sm focus:border-app-accent/50 transition-all resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentDraft('');
                                }}
                                className="rounded-full border border-app-line px-4 py-2 text-[11px] font-semibold text-app-ink bg-white hover:bg-app-ink/5 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => updateCommentMutation.mutate({ commentId: comment.id, content: editCommentDraft, version: comment.version })}
                                disabled={!editCommentDraft.trim() || updateCommentMutation.isPending}
                                className="rounded-full bg-app-accent px-4 py-2 text-[11px] font-semibold text-white hover:bg-app-accent/90 disabled:opacity-50 transition-all"
                              >
                                {updateCommentMutation.isPending ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-app-ink whitespace-pre-wrap leading-relaxed pl-1">{comment.content}</p>
                        )}
                      </div>
                    ))
                  )}

                  {/* Comments Pagination */}
                  {commentsData?.pageInfo && (commentsData.pageInfo.hasNextPage || commentCursorHistory.length > 0) && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <button
                        onClick={() => {
                          const history = [...commentCursorHistory];
                          history.pop();
                          setCommentCursorHistory(history);
                          setCommentCursor(history[history.length - 1] || null);
                        }}
                        disabled={commentCursorHistory.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white px-4 py-2 text-xs font-semibold text-app-ink hover:border-app-ink/20 disabled:opacity-40 transition-all duration-300"
                      >
                        <ArrowLeft size={12} />
                        Prev
                      </button>
                      <button
                        onClick={() => {
                          if (commentsData.pageInfo.endCursor) {
                            setCommentCursorHistory([...commentCursorHistory, commentCursor || '']);
                            setCommentCursor(commentsData.pageInfo.endCursor);
                          }
                        }}
                        disabled={!commentsData.pageInfo.hasNextPage}
                        className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white px-4 py-2 text-xs font-semibold text-app-ink hover:border-app-ink/20 disabled:opacity-40 transition-all duration-300"
                      >
                        Next
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Log Tab View */}
            {taskTab === 'activity' && (
              <div className="space-y-6">
                <div className="space-y-6 relative border-l-2 border-app-line ml-4 pl-6 py-2">
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8 text-app-muted text-sm gap-2 -ml-6">
                      <Loader2 size={16} className="animate-spin" /> Loading activity log...
                    </div>
                  ) : logsData?.logs.length === 0 ? (
                    <div className="text-center py-8 text-sm text-app-muted -ml-6 border border-dashed border-app-line rounded-2xl bg-app-ink/2">
                      No activities logged.
                    </div>
                  ) : (
                    logsData?.logs.map((log) => {
                      let icon = <PencilLine size={12} className="text-app-accent" />;
                      let bgClass = "bg-app-accent/10 ring-app-accent/20";

                      if (log.actionType === 'task.created') {
                        icon = <Plus size={12} className="text-green-600" />;
                        bgClass = "bg-green-100 ring-green-200/50";
                      } else {
                        const fields = log.changes.map(c => c.field);
                        if (fields.includes('status')) {
                          icon = <CheckCircle2 size={12} className="text-blue-600" />;
                          bgClass = "bg-blue-100 ring-blue-200/50";
                        } else if (fields.includes('priority')) {
                          icon = <ShieldAlert size={12} className="text-amber-600" />;
                          bgClass = "bg-amber-100 ring-amber-200/50";
                        } else if (fields.includes('dueDate')) {
                          icon = <Calendar size={12} className="text-purple-600" />;
                          bgClass = "bg-purple-100 ring-purple-200/50";
                        } else if (fields.includes('teamId') || fields.includes('memberId')) {
                          icon = <Users size={12} className="text-indigo-600" />;
                          bgClass = "bg-indigo-100 ring-indigo-200/50";
                        }
                      }

                      return (
                        <div key={log.id} className="relative group">
                          {/* Timeline marker with custom micro-animations */}
                          <span className={`absolute -left-[33px] top-1 flex h-6 w-6 items-center justify-center rounded-full ${bgClass} ring-4 ring-white transition-transform group-hover:scale-110 duration-300`}>
                            {icon}
                          </span>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs font-bold text-app-ink">{log.actor.username}</span>
                              <span className="text-[10px] text-app-muted">{formatDate(log.createdAt)}</span>
                            </div>

                            {log.actionType === 'task.created' ? (
                              <p className="text-sm text-app-muted leading-relaxed">Created this task.</p>
                            ) : (
                              <div className="space-y-1 mt-1">
                                {log.changes.map((change, idx) => {
                                  const displayField = change.field.replace('fk_', '').replace('_id', '');

                                  return (
                                    <div key={idx} className="text-sm leading-relaxed text-app-muted">
                                      updated <span className="font-semibold text-app-ink capitalize">{displayField}</span>:{' '}
                                      {change.field === 'status' ? (
                                        <span className="inline-flex flex-wrap items-center gap-1.5">
                                          changed from <StatusBadge status={change.oldValue || 'TODO'} /> to <StatusBadge status={change.newValue || 'TODO'} />
                                        </span>
                                      ) : change.field === 'priority' ? (
                                        <span className="inline-flex flex-wrap items-center gap-1.5">
                                          changed from <PriorityBadge priority={Number(change.oldValue ?? 0) as any} /> to <PriorityBadge priority={Number(change.newValue ?? 0) as any} />
                                        </span>
                                      ) : (
                                        <span>
                                          changed from <span className="italic line-through opacity-60">"{change.oldValue ?? 'none'}"</span> to <span className="font-semibold text-app-ink">"{change.newValue ?? 'none'}"</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Logs Pagination */}
                  {logsData?.pageInfo && (logsData.pageInfo.hasNextPage || logCursorHistory.length > 0) && (
                    <div className="flex items-center justify-center gap-2 pt-4 -ml-6">
                      <button
                        onClick={() => {
                          const history = [...logCursorHistory];
                          history.pop();
                          setLogCursorHistory(history);
                          setLogCursor(history[history.length - 1] || null);
                        }}
                        disabled={logCursorHistory.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white px-4 py-2 text-xs font-semibold text-app-ink hover:border-app-ink/20 disabled:opacity-40 transition-all duration-300"
                      >
                        <ArrowLeft size={12} />
                        Prev
                      </button>
                      <button
                        onClick={() => {
                          if (logsData.pageInfo.endCursor) {
                            setLogCursorHistory([...logCursorHistory, logCursor || '']);
                            setLogCursor(logsData.pageInfo.endCursor);
                          }
                        }}
                        disabled={!logsData.pageInfo.hasNextPage}
                        className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white px-4 py-2 text-xs font-semibold text-app-ink hover:border-app-ink/20 disabled:opacity-40 transition-all duration-300"
                      >
                        Next
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                projectId={task.project?.id || ''}
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
                projectId={task.project?.id || ''}
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

          <SurfaceCardStrong className="p-5 md:p-6">
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Slippage Blast Radius Simulator</h2>
                <p className="text-xs text-app-muted mt-1">Simulate cascading blocker delays across the dependency map.</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-app-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-app-accent self-start">
                <ShieldAlert size={12} />
                Graph Powered
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-app-line/60 bg-white/40 p-4">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm font-semibold text-app-ink">Simulated Schedule Delay</span>
                  <span className="text-sm font-bold text-app-accent px-2.5 py-1 bg-app-accent/10 rounded-xl">
                    +{sliderDelayDays} {sliderDelayDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={sliderDelayDays}
                  onChange={(e) => setSliderDelayDays(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-app-line accent-app-accent cursor-pointer outline-none transition"
                />
                <div className="flex justify-between text-[10px] text-app-muted mt-1">
                  <span>No delay (0d)</span>
                  <span>15 days</span>
                  <span>30 days</span>
                </div>
              </div>

              {sliderDelayDays === 0 ? (
                <div className="text-center py-6 border border-dashed border-app-line rounded-2xl bg-white/20">
                  <p className="text-sm text-app-muted">Drag the slider above to forecast cascading schedule slips!</p>
                </div>
              ) : simulationLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 size={20} className="animate-spin text-app-accent" />
                  <span className="text-sm text-app-muted">Simulating path delays...</span>
                </div>
              ) : simulatedSlips && simulatedSlips.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-app-line bg-white/45 p-3 text-center">
                      <div className="text-[10px] font-semibold text-app-muted uppercase tracking-wider">Blast Radius</div>
                      <div className="text-xl font-bold text-app-ink mt-1">
                        {simulatedSlips.length - 1} {simulatedSlips.length - 1 === 1 ? 'task' : 'tasks'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-app-line bg-white/45 p-3 text-center">
                      <div className="text-[10px] font-semibold text-app-muted uppercase tracking-wider">Critical Slips</div>
                      <div className="text-xl font-bold text-app-danger mt-1">
                        {simulatedSlips.filter(s => s.riskLevel === 'HIGH' && s.taskId !== taskId).length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-app-line bg-white/45 p-3 text-center col-span-2 md:col-span-1">
                      <div className="text-[10px] font-semibold text-app-muted uppercase tracking-wider">Max Chain Slip</div>
                      <div className="text-xl font-bold text-app-warning mt-1">
                        +{Math.max(...simulatedSlips.map(s => s.slipDays))}d
                      </div>
                    </div>
                  </div>

                  {/* Header alert if milestones slip */}
                  {simulatedSlips.some(s => s.riskLevel === 'HIGH' && s.taskId !== taskId) && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-app-danger/15 bg-app-danger/10 px-4 py-3 text-sm text-app-danger">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Milestone slip alert!</span> This simulated delay causes downstream tasks to violate their target deadlines.
                      </div>
                    </div>
                  )}

                  {/* Task list showing slip details */}
                  <div className="rounded-2xl border border-app-line bg-white/20 divide-y divide-app-line overflow-hidden max-h-[300px] overflow-y-auto">
                    {simulatedSlips.map(slip => {
                      const isSelf = slip.taskId === taskId;
                      const badgeStyles = {
                        HIGH: 'bg-app-danger/12 text-app-danger',
                        MEDIUM: 'bg-app-accent/12 text-app-accent',
                        LOW: 'bg-app-success/12 text-app-success',
                      };

                      return (
                        <div key={slip.taskId} className={`p-3 flex items-center justify-between gap-4 hover:bg-white/40 transition ${isSelf ? 'bg-app-accent/5' : ''}`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-app-ink truncate">{slip.title}</span>
                              {isSelf && <span className="rounded-md bg-app-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-app-accent">Delayed Task</span>}
                            </div>
                            <div className="text-[10px] text-app-muted mt-0.5 flex flex-wrap gap-2">
                              <span>Due: {slip.originalDueDate ? formatDate(slip.originalDueDate) : 'No date'}</span>
                              {slip.simulatedDueDate && (
                                <span className="font-medium text-app-accent">
                                  Simulated: {formatDate(slip.simulatedDueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-bold">
                              {slip.slipDays > 0 ? `+${slip.slipDays}d` : 'on time'}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badgeStyles[slip.riskLevel]}`}>
                              {slip.riskLevel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-app-line rounded-2xl bg-white/20">
                  <p className="text-sm text-app-muted">Failed to compute schedule simulation.</p>
                </div>
              )}
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
              <TextField type="date" label="Due Date" value={dueDateDraft} onChange={setDueDateDraft} />
              
              <div className="grid grid-cols-2 gap-4">
                <CustomFormSelect
                  label="Status"
                  value={statusDraft}
                  onChange={setStatusDraft}
                  options={[
                    { label: 'Todo', value: 'TODO' },
                    { label: 'In Progress', value: 'IN_PROGRESS' },
                    { label: 'Done', value: 'DONE' },
                    { label: 'Canceled', value: 'CANCELED' },
                  ]}
                />
                <CustomFormSelect
                  label="Priority"
                  value={priorityDraft}
                  onChange={setPriorityDraft}
                  type="number"
                  options={[
                    { label: 'Urgent (P0)', value: 0 },
                    { label: 'High (P1)', value: 1 },
                    { label: 'Medium (P2)', value: 2 },
                    { label: 'Low (P3)', value: 3 },
                  ]}
                />
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
                      <option key={m.id} value={m.user?.id}>{m.user?.username || m.user?.id}</option>
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
      <AppModal
        open={isGraphModalOpen}
        title="Task Graph"
        onClose={() => setIsGraphModalOpen(false)}
        size="full"
      >
        <div className="flex-1 overflow-hidden relative rounded-2xl bg-white border border-app-line mt-4">
           {isGraphModalOpen && <TaskGraphView projectId={task.project?.id || ''} focusedTaskId={taskId} />}
        </div>
      </AppModal>
    </div>
  );
};

function MetaItem({ 
  label, 
  value, 
  children,
  isEditing,
  onEditClick,
  editNode
}: { 
  label: string; 
  value?: string; 
  children?: React.ReactNode;
  isEditing?: boolean;
  onEditClick?: () => void;
  editNode?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-app-accent/10 px-4 py-4 group relative transition hover:bg-app-accent/15">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">{label}</p>
        {onEditClick && !isEditing && (
          <button 
            onClick={onEditClick}
            className="hidden group-hover:flex items-center justify-center rounded-md p-1 text-app-accent hover:bg-app-accent/20 transition-colors"
          >
            <PencilLine size={14} />
          </button>
        )}
      </div>
      <div className="text-sm font-medium text-app-ink flex items-center min-h-[28px]">
        {isEditing ? editNode : (value || children)}
      </div>
    </div>
  );
}

function DependencyCard({
  title,
  links,
  direction,
  description,
  projectId,
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
  projectId: string;
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
                      <Link 
                        to="/projects/$projectId/tasks/$taskId"
                        params={{ projectId: projectId, taskId: task.id }}
                        className="text-sm font-semibold text-app-ink hover:underline"
                      >
                        {task.title}
                      </Link>
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
                            className="rounded-lg p-1 text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
                            title="Remove link"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      {(pageData.hasNextPage || pageData.hasPreviousPage) && (
        <div className="mt-6 flex items-center justify-center gap-2 border-t border-app-line/60 pt-4">
          <PagingButton onClick={onPrev} disabled={!pageData.hasPreviousPage}>
            <ArrowLeft size={14} />
            Prev
          </PagingButton>
          <PagingButton onClick={onNext} disabled={!pageData.hasNextPage}>
            Next
            <ArrowRight size={14} />
          </PagingButton>
        </div>
      )}
    </SurfaceCard>
  );
}


