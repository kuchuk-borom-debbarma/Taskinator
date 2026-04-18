import { 
  createRootRouteWithContext, 
  createRoute, 
  createRouter, 
  Outlet, 
  useNavigate,
  lazyRouteComponent,
  redirect
} from '@tanstack/react-router';
import { Sidebar } from './components/Layout/Sidebar';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from './context/ApiContext';
import { useAuth, type AuthContextType } from './context/AuthContext';
import { AuthScreen } from './components/Auth/AuthScreen';
import { LayoutGrid, ArrowRight, Loader2 } from 'lucide-react';
import { NotFoundComponent, GlobalErrorComponent } from './components/Layout/RouterFeedback';

interface MyRouterContext {
  auth: AuthContextType;
}

// Root Route - Handles Global State & Loading
export const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: GlobalErrorComponent,
});

function RootComponent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0d0e]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-2 border-focus-blue border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(35,131,226,0.3)]" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">System Initializing</p>
            <p className="text-[10px] font-bold text-focus-blue uppercase tracking-[0.1em]">Taskinator v2.0</p>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

// --- Layout Routes ---

// Authenticated Layout (Sidebar + Protected Content)
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated-layout',
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/auth' });
    }
  },
  component: () => (
    <div className="flex h-screen overflow-hidden bg-bg-notion">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto p-3 pl-3">
        <div className="glass-panel-dark rounded-[32px] min-h-full overflow-hidden text-slate-100">
          <Outlet />
        </div>
      </main>
    </div>
  ),
});

// Primary Public Layout (Clean Shell)
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});

// --- Auth Routes ---

const authRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/auth',
  component: () => <AuthScreen />,
});

// --- Protected Routes ---

const indexRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/',
  component: ProjectDashboard,
});

function ProjectDashboard() {
  const navigate = useNavigate();
  const { projectApi } = useApi();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['dashboard-projects'],
    queryFn: ({ pageParam }) => projectApi.getProjects(12, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  const createMutation = useMutation({
    mutationFn: () => projectApi.createProject(newName.trim(), newDesc.trim() || undefined),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
    },
  });

  const projects = data?.pages.flatMap(p => p.projects) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-text-dim">
        <Loader2 className="w-5 h-5 animate-spin text-focus-blue" />
        <span className="text-[13px] font-medium">Loading projects...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-red-600">
        <p className="font-bold">Failed to load projects.</p>
        <p className="text-sm">Please ensure the backend is running and you are signed in.</p>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-focus-blue to-blue-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-focus-blue/20">
            <LayoutGrid size={22} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-focus-blue to-blue-400 text-white rounded-2xl font-bold text-[13px] hover:brightness-105 transition-all shadow-lg shadow-focus-blue/20 active:scale-95"
        >
          <ArrowRight size={15} className="-rotate-45" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div 
            key={p.id}
            onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: p.id } })}
            className="group glass-card p-6 rounded-[24px] hover:shadow-premium hover:-translate-y-0.5 hover:border-focus-blue/30 transition-all cursor-pointer flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-focus-blue transition-colors">{p.name}</h3>
              <p className="text-sm text-text-dim line-clamp-2 mb-6">{p.description || 'No description provided.'}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">
                v{p.version}
              </span>
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/70 border border-white/70 text-text-dim group-hover:bg-focus-blue group-hover:text-white group-hover:border-focus-blue transition-all">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        ))}

        <div
          onClick={() => setShowCreate(true)}
          className="glass-card p-6 border-2 border-dashed border-slate-200/80 rounded-[24px] flex flex-col items-center justify-center gap-3 hover:border-focus-blue/30 hover:bg-white/75 transition-all cursor-pointer group min-h-[160px]"
        >
          <div className="w-11 h-11 rounded-full bg-white/75 border border-white/70 flex items-center justify-center text-text-dim group-hover:bg-focus-blue group-hover:border-focus-blue group-hover:text-white transition-all">
            <span className="text-xl font-bold leading-none">+</span>
          </div>
          <p className="text-sm font-semibold text-text-notion">New Project</p>
        </div>
      </div>

      {hasNextPage && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="glass-button px-6 py-2.5 rounded-full hover:shadow-premium hover:border-focus-blue/30 transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
          >
            {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} className="rotate-90" />}
            {isFetchingNextPage ? 'Loading...' : 'Load More Projects'}
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/18 backdrop-blur-md" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md glass-card rounded-[28px] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-text-notion text-base tracking-tight">Create New Project</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl text-text-dim hover:bg-white/70 transition-all"><ArrowRight size={14} className="rotate-45" /></button>
            </div>
            <form
              onSubmit={e => { e.preventDefault(); if (newName.trim()) createMutation.mutate(); }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">Project Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Q3 Product Launch"
                  className="w-full px-4 py-3 bg-white/70 border border-white/70 rounded-2xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/40 focus:bg-white placeholder:text-text-dim/40 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-2">Description <span className="normal-case font-medium opacity-50">(optional)</span></label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/70 border border-white/70 rounded-2xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/40 focus:bg-white placeholder:text-text-dim/40 transition-all resize-none"
                />
              </div>
              {createMutation.isError && (
                <p className="text-red-500 text-xs font-bold">{(createMutation.error as Error).message}</p>
              )}
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 glass-button rounded-2xl text-text-dim hover:text-text-notion font-bold text-[13px] transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newName.trim()}
                  className="flex-1 py-3 bg-focus-blue text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-focus-blue/90 transition-all disabled:opacity-50 shadow-md shadow-focus-blue/20"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const projectLayoutRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'projects/$projectId',
});

const projectListRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./ProjectTasksIndex.lazy.tsx')),
});

const taskDetailRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'tasks/$taskId',
  component: lazyRouteComponent(() => import('./TaskDetailPage.lazy.tsx')),
});

// --- Route Tree Construction ---

export const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    authRoute,
  ]),
  authLayoutRoute.addChildren([
    indexRoute,
    projectLayoutRoute.addChildren([
      projectListRoute,
      taskDetailRoute,
    ]),
  ]),
]);

export const router = createRouter({ 
  routeTree,
  context: {
    auth: undefined! 
  },
  defaultNotFoundComponent: NotFoundComponent,
  defaultErrorComponent: GlobalErrorComponent,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
