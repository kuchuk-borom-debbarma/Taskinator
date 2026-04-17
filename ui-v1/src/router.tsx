import { useEffect } from 'react';
import { 
  createRootRoute, 
  createRoute, 
  createRouter, 
  Outlet, 
  useNavigate,
  useParams,
  lazyRouteComponent
} from '@tanstack/react-router';
import { Sidebar } from './components/Layout/Sidebar';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from './context/ApiContext';
import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/Auth/AuthScreen';
import { LayoutGrid, ArrowRight, Loader2 } from 'lucide-react';
import { NotFoundComponent, GlobalErrorComponent } from './components/Layout/RouterFeedback';

// Root Route - Contains the Global Sidebar
const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: GlobalErrorComponent,
});

function RootComponent() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/auth' });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-notion">
        <div className="w-8 h-8 border-4 border-focus-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Outlet />; // AuthScreen will handles this
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  );
}

// Auth Route
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: () => <AuthScreen />,
});

// Index Route (Dashboard)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ProjectDashboard,
});

function ProjectDashboard() {
  const navigate = useNavigate();
  const { projectApi } = useApi();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['dashboard-projects'],
    queryFn: ({ pageParam }) => projectApi.getProjects(5, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  const projects = data?.pages.flatMap(p => p.projects) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-focus-blue" />
        <span className="ml-3 text-text-dim">Loading your projects...</span>
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
    <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-focus-blue rounded-lg flex items-center justify-center text-white shadow-md">
            <LayoutGrid size={22} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Project Dashboard</h1>
        </div>
        <div className="text-xs font-mono bg-bg-secondary px-2 py-1 rounded text-text-dim border border-border-notion">
          LIMIT: 5 (TEST_MODE)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((p) => (
          <div 
            key={p.id}
            onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: p.id } })}
            className="group p-6 bg-white border border-border-notion rounded-xl shadow-notion hover:shadow-premium hover:border-focus-blue transition-all cursor-pointer flex flex-col justify-between"
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

        <div className="p-6 border-2 border-dashed border-border-notion rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-black/5 hover:border-focus-blue/30 transition-all cursor-pointer opacity-70 group min-h-[160px]">
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-dim group-hover:bg-focus-blue group-hover:text-white transition-all">
            <span className="text-xl font-bold">+</span>
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
    </div>
  );
}

// Project Layout Route (Handles $projectId context)
const projectLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'projects/$projectId',
});

// Project List (Index of Project Layout)
const projectListRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./ProjectTasksIndex.lazy.tsx')),
});

// Task Detail Page (Sibling to List within Project Layout)
const taskDetailRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'tasks/$taskId',
  component: lazyRouteComponent(() => import('./TaskDetailPage.lazy.tsx')),
});

// These components are now moved to lazy files

export const routeTree = rootRoute.addChildren([
  authRoute,
  indexRoute,
  projectLayoutRoute.addChildren([
    projectListRoute,
    taskDetailRoute,
  ]),
]);

export const router = createRouter({ 
  routeTree,
  defaultNotFoundComponent: NotFoundComponent,
  defaultErrorComponent: GlobalErrorComponent,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
