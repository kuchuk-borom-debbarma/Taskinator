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
import { TaskDetailPerspective } from './components/Tasks/TaskDetailPerspective';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './context/ApiContext';

// Root Route
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

// Project Route
const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'projects/$projectId',
  component: ProjectContainer,
});

// Task Detail (Nested within Project)
const taskDetailRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'tasks/$taskId',
  component: TaskDetailContainer,
});

function ProjectContainer() {
  const { projectId } = useParams({ from: projectRoute.id });
  const { taskApi } = useApi();
  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => taskApi.getProjectTasks(projectId),
  });

  return (
    <>
      <TaskListView tasks={tasks || []} />
      <Outlet />
    </>
  );
}

function TaskDetailContainer() {
  const { taskId } = useParams({ from: taskDetailRoute.id });
  const navigate = useNavigate();

  return (
    <TaskDetailPerspective 
      taskId={taskId} 
      onClose={() => navigate({ to: '..' })} 
    />
  );
}

export const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute.addChildren([taskDetailRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
