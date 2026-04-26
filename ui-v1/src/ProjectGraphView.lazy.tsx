import { createLazyFileRoute } from '@tanstack/react-router';
import { TaskGraphView } from './components/Tasks/TaskGraphView';

export const Route = createLazyFileRoute('/authenticated-layout/projects/$projectId/graph')({
  component: TaskGraphView,
});
