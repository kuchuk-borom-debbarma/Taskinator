import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Filter, FolderKanban, Loader2, Plus, Search, Eye } from 'lucide-react';
import { useApi } from './hooks/useApi';
import type { ProjectTask, TaskStatus, TaskPriority } from './api/types';
import {
  AppModal,
  CustomFormSelect,
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
import { useDebounce } from './hooks/useDebounce';

type TaskSearch = {
  cursor?: string;
  direction?: 'forward' | 'backward';
};

export default function ProjectTasksIndex() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/tasks' }) as TaskSearch;
  const { taskApi, projectApi, teamApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | number>('ALL');
  const [teamFilter, setTeamFilter] = useState<'ALL' | string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<'ALL' | string>('ALL');

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>(2);
  const [dueDate, setDueDate] = useState('');

  // Fetch all teams for the dropdown filter
  const { data: teamsData } = useQuery({
    queryKey: ['project-teams-all', projectId],
    queryFn: () => teamApi.getTeams(projectId!, { first: 100 }),
    enabled: !!projectId,
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  // Fetch all members for the dropdown filter
  const { data: membersData } = useQuery({
    queryKey: ['project-members-all', projectId],
    queryFn: () => projectApi.getProjectMembers(projectId!, { first: 100 }),
    enabled: !!projectId,
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      'tasks',
      projectId,
      debouncedQuery,
      statusFilter,
      priorityFilter,
      teamFilter,
      assigneeFilter,
      cursor,
      direction,
    ],
    queryFn: () => {
      const searchParams = {
        search: debouncedQuery.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        priority: priorityFilter === 'ALL' ? undefined : (priorityFilter as number),
        teamId: teamFilter === 'ALL' ? undefined : teamFilter,
        memberId: assigneeFilter === 'ALL' ? undefined : assigneeFilter,
      };

      if (direction === 'backward') {
        return taskApi.getTasks(projectId!, {
          last: CONFIG.PAGINATION.TASKS_LIST,
          before: cursor,
          ...searchParams,
        });
      }
      return taskApi.getTasks(projectId!, {
        first: CONFIG.PAGINATION.TASKS_LIST,
        after: direction === 'forward' ? cursor : undefined,
        ...searchParams,
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
      dueDate: dueDate || undefined,
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
      setDueDate('');
      navigate({ to: '/projects/$projectId/tasks/$taskId', params: { projectId: projectId!, taskId: task.id } });
    },
  });

  const resetPagination = () => {
    navigate({
      to: '/projects/$projectId/tasks',
      params: { projectId: projectId! },
      search: { cursor: undefined, direction: undefined },
    });
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    resetPagination();
  };

  const handleStatusFilterChange = (val: typeof statusFilter) => {
    setStatusFilter(val);
    resetPagination();
  };

  const handlePriorityFilterChange = (val: typeof priorityFilter) => {
    setPriorityFilter(val);
    resetPagination();
  };

  const handleTeamFilterChange = (val: typeof teamFilter) => {
    setTeamFilter(val);
    resetPagination();
  };

  const handleAssigneeFilterChange = (val: typeof assigneeFilter) => {
    setAssigneeFilter(val);
    resetPagination();
  };

  const filteredTasks = data?.tasks ?? [];

  return (
    <div className="page-frame animate-fade-in space-y-6">
      {/* Search and Filters Hub */}
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        {/* Left Side: Dynamic Filter Control Drawer */}
        <SurfaceCard className="p-5 flex flex-col justify-start h-fit gap-5">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-app-accent">Workspace Filters</span>
            <h2 className="text-base font-bold text-app-ink mt-0.5">Filter Tasks</h2>
          </div>

          {/* Search bar */}
          <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-xs font-bold text-app-ink uppercase tracking-wide opacity-90">
              <Search size={13} className="text-app-accent" />
              Search keywords
            </span>
            <div className="relative">
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder="Title or description..."
                className="w-full rounded-xl border border-slate-200 bg-white/70 pl-3.5 pr-8 py-2.5 text-xs text-app-ink outline-none transition focus:border-app-accent focus:bg-white focus:ring-4 focus:ring-app-accent/5 shadow-sm"
              />
              {query && (
                <button 
                  onClick={() => handleQueryChange('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-app-muted hover:text-app-ink cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </label>

          {/* Status filters */}
          <div className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-bold text-app-ink uppercase tracking-wide opacity-90">
              <Filter size={13} className="text-app-accent-2" />
              Lifecycle Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map((option) => {
                const isActive = statusFilter === option;
                return (
                  <button
                    key={option}
                    onClick={() => handleStatusFilterChange(option)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wide border transition duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-app-ink border-app-ink text-white shadow-sm'
                        : 'border-slate-200 bg-white/60 text-app-muted hover:border-slate-300 hover:text-app-ink'
                    }`}
                  >
                    {option === 'ALL' ? 'All' : option.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority dropdown */}
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-app-ink uppercase tracking-wide opacity-90">Severity Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => {
                const val = event.target.value;
                handlePriorityFilterChange(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-xs text-app-ink outline-none transition focus:border-app-accent focus:bg-white cursor-pointer shadow-sm"
            >
              <option value="ALL">All priorities</option>
              <option value={0}>Urgent (P0)</option>
              <option value={1}>High (P1)</option>
              <option value={2}>Medium (P2)</option>
              <option value={3}>Low (P3)</option>
            </select>
          </label>

          {/* Team Filter */}
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-app-ink uppercase tracking-wide opacity-90">Assigned Team</span>
            <select
              value={teamFilter}
              onChange={(event) => handleTeamFilterChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-xs text-app-ink outline-none transition focus:border-app-accent focus:bg-white cursor-pointer shadow-sm"
            >
              <option value="ALL">All teams</option>
              {teamsData?.teams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          {/* Assignee Filter */}
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-app-ink uppercase tracking-wide opacity-90">Workspace Contributor</span>
            <select
              value={assigneeFilter}
              onChange={(event) => handleAssigneeFilterChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-xs text-app-ink outline-none transition focus:border-app-accent focus:bg-white cursor-pointer shadow-sm"
            >
              <option value="ALL">All assignees</option>
              {membersData?.members?.map((member) => (
                <option key={member.id} value={member.user?.id}>
                  {member.user?.username || 'Unknown'}
                </option>
              ))}
            </select>
          </label>

          {/* Reset Filters button */}
          {(query !== '' || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || teamFilter !== 'ALL' || assigneeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setQuery('');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setTeamFilter('ALL');
                setAssigneeFilter('ALL');
                resetPagination();
              }}
              className="w-full rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 py-2.5 text-[10px] font-bold uppercase tracking-wider text-red-600 transition duration-300 cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </SurfaceCard>

        {/* Right Side: Primary Tasks Feed */}
        <SurfaceCardStrong className="p-6 space-y-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/40 pb-5 shrink-0">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-app-accent">Workspace Board</span>
              <h2 className="text-xl font-bold tracking-tight text-app-ink mt-0.5">Prioritized Issues</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 cursor-pointer shadow-sm shadow-app-accent/10"
              >
                <Plus size={14} />
                Create Task
              </button>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-app-muted border border-slate-200/30">
                {filteredTasks.length} Issues
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[400px]">
            {isLoading ? (
              <div className="flex min-h-[18rem] items-center justify-center">
                <Loader2 size={24} className="animate-spin text-app-accent" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No tasks match this view"
                description="Try refining your filter parameters or spawn a new task to organize this segment."
                action={
                  <button
                    onClick={() => setShowCreate(true)}
                    className="rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 cursor-pointer shadow-sm"
                  >
                    Create Task
                  </button>
                }
              />
            ) : (
              <div className="space-y-3.5">
                {filteredTasks.map((task) => (
                  <TaskRow key={task.id} task={task} projectId={projectId!} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination Deck */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-200/40 pt-5 shrink-0">
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
              <ArrowLeft size={12} />
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
              <ArrowRight size={12} />
            </PagingButton>
          </div>
        </SurfaceCardStrong>
      </div>

      {/* Task Creation Modal */}
      <AppModal
        open={showCreate}
        title="Create new task"
        description="Establish the scope of work. Assignees, dependencies, and discussion panels can be configured within task details."
        onClose={() => setShowCreate(false)}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            createTask.mutate();
          }}
        >
          <TextField label="Task Title" value={title} onChange={setTitle} placeholder="Build deployment deployment pipeline..." required />
          <TextAreaField label="Task Scope / Description" value={description} onChange={setDescription} placeholder="Detail requirements and implementation steps..." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CustomFormSelect
              label="Initial Status"
              value={status}
              onChange={setStatus}
              options={[
                { label: 'Todo', value: 'TODO' },
                { label: 'In progress', value: 'IN_PROGRESS' },
                { label: 'Done', value: 'DONE' },
              ]}
            />
            <CustomFormSelect
              label="Priority Level"
              value={priority}
              onChange={setPriority}
              type="number"
              options={[
                { label: 'Urgent (P0)', value: 0 },
                { label: 'High (P1)', value: 1 },
                { label: 'Medium (P2)', value: 2 },
                { label: 'Low (P3)', value: 3 },
              ]}
            />
            <TextField type="date" label="Due Date" value={dueDate} onChange={setDueDate} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/50">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-app-ink transition duration-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTask.isPending || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {createTask.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Task
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
      className="block rounded-2xl border border-slate-200/60 hover:border-app-accent/35 bg-white/70 p-4 transition-all duration-300 hover:translate-x-[2px] shadow-sm hover:shadow-md group"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="space-y-1.5 max-w-2xl">
          <h3 className="text-sm font-bold text-app-ink leading-snug group-hover:text-app-accent transition-colors">{task.title}</h3>
          {task.description ? (
            <p className="text-xs text-app-muted truncate-2 leading-relaxed">{task.description}</p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">No description added yet.</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-200/40 flex flex-wrap items-center justify-between gap-3 text-[11px] text-app-muted">
        <div className="flex items-center gap-4">
          <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/30">
            {task.team?.name || 'No assigned team'}
          </span>
          {task.assignedMember?.username ? (
            <span className="font-bold text-slate-600">@{task.assignedMember.username}</span>
          ) : (
            <span className="text-slate-400">Unassigned</span>
          )}
          <span>Updated {formatDate(task.updatedAt)}</span>
        </div>
        <span className="inline-flex items-center gap-1 font-bold text-app-accent hover:text-app-accent/80 transition-colors shrink-0">
          Open Details
          <Eye size={12} />
        </span>
      </div>
    </Link>
  );
}
