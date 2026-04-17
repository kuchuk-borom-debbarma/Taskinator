import { useParams } from '@tanstack/react-router';
import { useApi } from './context/ApiContext';
import { useQuery } from '@tanstack/react-query';
import { TaskListView } from './components/Tasks/TaskListView';

export default function ProjectTasksIndex() {
  const { projectId } = useParams({ strict: false });
  const { taskApi } = useApi();
  
  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => taskApi.getProjectTasks(projectId!),
    enabled: !!projectId,
  });

  const { data: links } = useQuery({
    queryKey: ['links', projectId],
    queryFn: () => taskApi.getProjectLinks(projectId!),
    enabled: !!projectId,
  });

  return <TaskListView tasks={tasks || []} links={links || []} />;
}
