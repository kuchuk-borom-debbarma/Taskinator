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
      <main className="flex-1 h-screen overflow-y-auto bg-white/50">
        <Outlet />
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
    <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-focus-blue rounded-lg flex items-center justify-center text-white shadow-md">
            <LayoutGrid size={22} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-focus-blue text-white rounded-lg font-bold text-[13px] hover:bg-focus-blue/90 transition-all shadow-md shadow-focus-blue/20 active:scale-95"
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
            className="group p-6 bg-white border border-border-notion rounded-xl shadow-notion hover:shadow-premium hover:border-focus-blue transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-focus-blue transition-colors">{p.name}</h3>
              <p className="text-sm text-text-dim line-clamp-2 mb-6">{p.description || 'No description provided.'}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">
                v{p.version}
              </span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-bg-secondary text-text-dim group-hover:bg-focus-blue group-hover:text-white transition-all">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        ))}

        <div
          onClick={() => setShowCreate(true)}
          className="p-6 border-2 border-dashed border-border-notion rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-black/5 hover:border-focus-blue/30 transition-all cursor-pointer opacity-70 group min-h-[140px]"
        >
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-dim group-hover:bg-focus-blue group-hover:text-white transition-all">
            <span className="text-xl font-bold leading-none">+</span>
          </div>
          <p className="text-sm font-medium">New Project</p>
        </div>
      </div>

      {hasNextPage && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-white border border-border-notion rounded-full shadow-notion hover:shadow-premium hover:border-focus-blue transition-all flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
          >
            {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} className="rotate-90" />}
            {isFetchingNextPage ? 'Loading...' : 'Load More Projects'}
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md bg-white border border-border-notion rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-text-notion text-base tracking-tight">Create New Project</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-text-dim hover:bg-bg-secondary transition-all"><ArrowRight size={14} className="rotate-45" /></button>
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
                  className="w-full px-4 py-3 bg-bg-secondary border border-border-notion rounded-xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/50 placeholder:text-text-dim/40 transition-all"
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
                  className="w-full px-4 py-3 bg-bg-secondary border border-border-notion rounded-xl text-[14px] font-medium text-text-notion focus:outline-none focus:border-focus-blue/50 placeholder:text-text-dim/40 transition-all resize-none"
                />
              </div>
              {createMutation.isError && (
                <p className="text-red-500 text-xs font-bold">{(createMutation.error as Error).message}</p>
              )}
              <div className="flex gap-3 mt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 border border-border-notion rounded-xl text-text-dim hover:text-text-notion font-bold text-[13px] transition-all hover:bg-bg-secondary">
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
