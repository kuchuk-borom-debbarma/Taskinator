import { useParams, useNavigate } from '@tanstack/react-router';
import { TaskDetailView } from './components/Tasks/TaskDetailView';

export default function TaskDetailPage() {
  const { taskId } = useParams({ strict: false });
  const navigate = useNavigate();

  if (!taskId) return null;

  return (
    <TaskDetailView 
      taskId={taskId} 
      onClose={() => navigate({ to: '..' })} 
    />
  );
}
