import { useParams, useNavigate, useSearch } from '@tanstack/react-router';
import { useApi } from './hooks/useApi';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskListView } from './components/Tasks/TaskListView';
import { useState } from 'react';
import { Plus, Loader2, X, Check } from 'lucide-react';

type CursorParam =
  | { direction: 'forward'; cursor: string | undefined }
  | { direction: 'backward'; cursor: string | undefined }
  | undefined;

export default function ProjectTasksIndex() {
  const { projectId } = useParams({ strict: false });
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/' }) as any;
  const { taskApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const {
    data: tasksData,
    isLoading,
    hasNextPage: _hasNextPage,
    isFetchingNextPage,
    hasPreviousPage: _hasPreviousPage,
    isFetchingPreviousPage,
  } = useInfiniteQuery({
    queryKey: ['tasks', projectId, cursor, direction],
    queryFn: ({ pageParam }: { pageParam: CursorParam }) => {
      // Use the pageParam if provided (e.g. by fetchNextPage), otherwise fall back to URL cursor
      const activeParam = pageParam || (cursor ? { direction: direction || 'forward', cursor } : undefined);
      
      if (activeParam?.direction === 'backward') {
        return taskApi.getProjectTasks(
          projectId!,
          undefined,
          undefined,
          undefined,
          5,
          activeParam.cursor,
        );
      }
      return taskApi.getProjectTasks(
        projectId!,
        undefined,
        5,
        activeParam?.direction === 'forward' ? activeParam.cursor : undefined,
      );
    },
    initialPageParam: (cursor ? { direction: direction || 'forward', cursor } : undefined) as CursorParam,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage
        ? { direction: 'forward' as const, cursor: lastPage.endCursor }
        : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.hasPreviousPage
        ? { direction: 'backward' as const, cursor: firstPage.startCursor }
        : undefined,
    enabled: !!projectId,
    maxPages: 1, 
  });

  const allTasks = tasksData?.pages.flatMap((page) => page.tasks) ?? [];
  const firstPage = tasksData?.pages[0];
  const lastPage = tasksData?.pages[tasksData.pages.length - 1];

  const createMutation = useMutation({
    mutationFn: () =>
      taskApi.createTask(projectId!, newTitle.trim(), newDesc.trim() || undefined),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setNewTitle('');
      setNewDesc('');
      setShowCreate(false);
      navigate({
        to: '/projects/$projectId/tasks/$taskId',
        params: { projectId: projectId!, taskId: task.id } as any,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-dim">
        <Loader2 size={20} className="animate-spin text-focus-blue" />
        <span className="text-[13px] font-medium">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <TaskListView
        tasks={allTasks}
        _projectId={projectId!}
        hasNextPage={lastPage?.hasNextPage}
        hasPreviousPage={firstPage?.hasPreviousPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchingPreviousPage={isFetchingPreviousPage}
        onLoadMore={() => {
          const lastPage = tasksData?.pages[tasksData.pages.length - 1];
          if (lastPage?.hasNextPage) {
            (navigate as any)({
              search: (prev: any) => ({ 
                ...prev, 
                cursor: lastPage.endCursor!, 
                direction: 'forward' as const 
              }) as any,
            });
          }
        }}
        onLoadPrev={() => {
          const firstPage = tasksData?.pages[0];
          if (firstPage?.hasPreviousPage) {
            (navigate as any)({
              search: (prev: any) => ({ 
                ...prev, 
                cursor: firstPage.startCursor!, 
                direction: 'backward' as const 
              }) as any,
            });
          }
        }}
      />

      {/* Floating Create Task Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-focus-blue text-white rounded-full shadow-2xl shadow-focus-blue/40 flex items-center justify-center hover:bg-focus-blue/90 hover:scale-105 active:scale-95 transition-all z-40"
        title="Create Task"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-border-notion rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-text-notion text-base tracking-tight">New Task</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg text-text-dim hover:bg-bg-secondary transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTitle.trim()) createMutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">
                  Title
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-3 bg-bg-secondary border border-border-notion rounded-xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/50 placeholder:text-text-dim/40 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">
                  Description{' '}
                  <span className="normal-case font-medium opacity-50">(optional)</span>
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-bg-secondary border border-border-notion rounded-xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/50 placeholder:text-text-dim/40 transition-all resize-none"
                />
              </div>

              {createMutation.isError && (
                <p className="text-red-500 text-xs font-bold">
                  {(createMutation.error as Error).message}
                </p>
              )}

              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 border border-border-notion rounded-xl text-text-dim hover:text-text-notion font-bold text-[13px] transition-all hover:bg-bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newTitle.trim()}
                  className="flex-1 py-3 bg-focus-blue text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-focus-blue/90 transition-all disabled:opacity-50 shadow-md shadow-focus-blue/20"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {createMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}