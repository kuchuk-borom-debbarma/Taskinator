import { 
  createRootRoute, 
  createRoute, 
  createRouter, 
  Outlet, 
  redirect,
  useParams,
  useNavigate,
  Link
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useAuth, useAuthStore } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { ProjectDashboard } from './features/workspace/ProjectDashboard';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { ProjectSidebar } from './components/ProjectSidebar';
import { Header } from './components/Header';
import { NotificationPanel } from './components/NotificationPanel';
import { useUIStore } from './store/ui';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from './graphql/client';
import { GET_PROJECT, GET_UNREAD_NOTIFICATIONS_COUNT } from './graphql/operations';
import { TaskListView } from './components/TaskListView';
import { TeamGrid } from './components/TeamGrid';
import { TaskDetailView } from './components/TaskDetailView';
import { AnimatePresence } from 'framer-motion';
import { useRealtime } from './hooks/useRealtime';
import { GlobalModals } from './components/GlobalModals';
import { Plus } from 'lucide-react';

// Root Route
const rootRoute = createRootRoute({
  component: () => {
    const { user } = useAuth();
    
    // Global Realtime Hook
    useRealtime(user?.id || '', undefined);

    return (
      <div className="h-screen w-screen bg-background text-foreground overflow-hidden font-sans antialiased selection:bg-primary/30">
        <Outlet />
        <GlobalModals />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </div>
    );
  },
});

// Auth Route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => {
    const { login } = useAuth();
    return <Auth onLogin={login} />;
  },
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/' });
    }
  }
});

// Dashboard Route (Home)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    const { user } = useAuth();
    if (!user) return null;
    
    return (
      <ProjectDashboard 
        userId={user.id}
        username={user.username}
      />
    );
  },
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  }
});

// Project Layout Route
const projectLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/project/$projectId',
  component: () => {
    const { projectId } = useParams({ from: projectLayoutRoute.id });
    const { user, logout } = useAuth();
    const { isNotificationPanelOpen, toggleNotificationPanel, setActiveModal } = useUIStore();
    
    const { data: projectData } = useQuery({
      queryKey: ['project', projectId],
      queryFn: () => gqlClient.request<any>(GET_PROJECT, { id: projectId }),
    });
    
    const { data: unreadData } = useQuery({
        queryKey: ['notifications-unread', user?.id],
        queryFn: () => gqlClient.request<any>(GET_UNREAD_NOTIFICATIONS_COUNT),
        enabled: !!user?.id,
    });

    if (!user) return null;

    return (
      <WorkspaceLayout
        isFocused={true}
        sidebar={
          <ProjectSidebar 
            userId={user.id}
            username={user.username}
            onLogout={logout}
            selectedProjectId={projectId}
          />
        }
        header={
          <Header 
            projectName={projectData?.project?.name}
            unreadCount={unreadData?.unreadNotificationsCount || 0}
          >
            <NotificationPanel 
              isOpen={isNotificationPanelOpen}
              onClose={() => toggleNotificationPanel()}
              userId={user.id}
            />
          </Header>
        }
      >
        <div className="h-full flex flex-col min-h-0 relative">
          <div className="px-10 py-10 flex items-center justify-between shrink-0">
            <div className="space-y-4">
              <h2 className="text-3xl font-black tracking-tight text-foreground/90">{projectData?.project?.name}</h2>
              <div className="flex items-center gap-6">
                 <Link 
                    to="/project/$projectId/tasks"
                    params={{ projectId }}
                    activeProps={{ className: "border-primary text-primary" }}
                    inactiveProps={{ className: "border-transparent text-muted-foreground hover:text-white/80" }}
                    className="text-xs font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all"
                 >
                    Tasks
                 </Link>
                 <Link 
                    to="/project/$projectId/team"
                    params={{ projectId }}
                    activeProps={{ className: "border-primary text-primary" }}
                    inactiveProps={{ className: "border-transparent text-muted-foreground hover:text-white/80" }}
                    className="text-xs font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all"
                 >
                    Teams
                 </Link>
              </div>
            </div>
            
            <button
               onClick={() => {
                  const isTasks = window.location.pathname.includes('/tasks');
                  setActiveModal(isTasks ? 'CREATE_TASK' : 'CREATE_TEAM');
               }}
               className="bg-primary hover:bg-indigo-500 text-white text-[13px] font-black px-8 py-3 rounded-full transition-all shadow-[0_10px_40px_rgb(99,102,241,0.3)] hover:-translate-y-1 active:scale-95 flex items-center gap-3"
            >
              <Plus size={20} strokeWidth={3} />
              Create
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden relative">
             <Outlet />
          </div>
        </div>
      </WorkspaceLayout>
    );
  }
});

// Project Tasks Route
const projectTasksRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/tasks',
  component: () => {
    const { projectId } = useParams({ from: projectLayoutRoute.id });
    const navigate = useNavigate();
    return (
      <TaskListView 
        projectId={projectId}
        onOpenDetails={(id: string) => navigate({ to: '/project/$projectId/tasks/$taskId', params: { projectId, taskId: id } })}
      />
    );
  }
});

// Project Team Route
const projectTeamRoute = createRoute({
    getParentRoute: () => projectLayoutRoute,
    path: '/team',
    component: () => {
      const { projectId } = useParams({ from: projectLayoutRoute.id });
      return (
        <TeamGrid 
            projectId={projectId}
            selectedTeamId={null}
        />
      );
    }
});

// Add Task Detail Route (nested under tasks)
const taskDetailRoute = createRoute({
    getParentRoute: () => projectTasksRoute,
    path: '/$taskId',
    component: () => {
        const { projectId } = useParams({ from: projectLayoutRoute.id });
        const { taskId } = useParams({ from: taskDetailRoute.id });
        const navigate = useNavigate();
        
        return (
          <AnimatePresence>
            <TaskDetailView 
                taskId={taskId}
                projectId={projectId}
                onClose={() => navigate({ to: '/project/$projectId/tasks', params: { projectId } })}
                onJumpToTask={(id) => navigate({ to: '/project/$projectId/tasks/$taskId', params: { projectId, taskId: id } })}
            />
          </AnimatePresence>
        );
    }
});

// Create the Route Tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  projectLayoutRoute.addChildren([
    projectTasksRoute.addChildren([taskDetailRoute]),
    projectTeamRoute
  ])
]);

// Create the Router
export const router = createRouter({
  routeTree,
});

// Register for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
