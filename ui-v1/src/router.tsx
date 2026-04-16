import { 
  createRootRoute, 
  createRoute, 
  createRouter, 
  Outlet, 
  useNavigate,
  useParams
} from '@tanstack/react-router';
import { Sidebar } from './components/Layout/Sidebar';
import { TaskListView } from './components/Tasks/TaskListView';
import { TaskDetailView } from './components/Tasks/TaskDetailView';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './context/ApiContext';

// Root Route - Contains the Global Sidebar
const rootRoute = createRootRoute({
  component: () => (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  ),
});

// Index Route (Redirect to projects)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <div style={{ padding: '40px' }}>Select a project from the sidebar to begin.</div>,
});

// Project Layout Route (Handles $projectId context)
const projectLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'projects/$projectId',
});

// Project List (Index of Project Layout)
const projectListRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/',
  component: ProjectTasksIndex,
});

// Task Detail Page (Sibling to List within Project Layout)
const taskDetailRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'tasks/$taskId',
  component: TaskDetailPage,
});

function ProjectTasksIndex() {
  const { projectId } = useParams({ from: projectListRoute.id });
  const { taskApi } = useApi();
  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => taskApi.getProjectTasks(projectId),
  });

  return <TaskListView tasks={tasks || []} />;
}

function TaskDetailPage() {
  const { taskId } = useParams({ from: taskDetailRoute.id });
  const navigate = useNavigate();

  return (
    <TaskDetailView 
      taskId={taskId} 
      onClose={() => navigate({ to: '..' })} 
    />
  );
}

export const routeTree = rootRoute.addChildren([
  indexRoute,
  projectLayoutRoute.addChildren([
    projectListRoute,
    taskDetailRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
