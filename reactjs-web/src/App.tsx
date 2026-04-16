import { useMemo } from 'react';
import { clampPage, pageForTask } from './data/taskSource';
import { useRouteState } from './hooks/useRouteState';
import { useSlidingTaskWindow } from './hooks/useSlidingTaskWindow';
import { WorkspaceChrome } from './components/WorkspaceChrome';
import { TaskTrailView } from './components/TaskTrailView';
import type { Task } from './types';

export function App() {
  const { route, navigate } = useRouteState();
  const taskWindow = useSlidingTaskWindow(route.page, route.taskId);

  const openTask = (task: Task) => {
    navigate({
      ...route,
      taskId: task.id,
      page: pageForTask(task.id),
      view: 'trail',
    });
  };

  const page = (direction: -1 | 1) => {
    const nextPage = clampPage(route.page + direction);
    const candidate = direction > 0 ? taskWindow.tasks.at(-1) : taskWindow.tasks[0];
    navigate({
      ...route,
      page: nextPage,
      taskId: candidate?.id ?? route.taskId,
    });
  };

  const content = useMemo(
    () => (
      <TaskTrailView
        tasks={taskWindow.tasks}
        taskMap={taskWindow.taskMap}
        links={taskWindow.links}
        stories={taskWindow.stories}
        focusedTask={taskWindow.focusedTask}
        hasPrevious={taskWindow.hasPrevious}
        hasNext={taskWindow.hasNext}
        loading={taskWindow.loading}
        loadedTaskCount={taskWindow.loadedTaskCount}
        loadedPageCount={taskWindow.loadedPageCount}
        onOpenTask={openTask}
        onPage={page}
      />
    ),
    [route, taskWindow],
  );

  return <WorkspaceChrome>{content}</WorkspaceChrome>;
}
