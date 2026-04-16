import type { LinkKind, Task, TaskLink, TaskPage, TaskStatus, TaskStory } from '../types';

const TOTAL_TASKS = 420;
const PAGE_SIZE = 18;
const teams = ['Design', 'Platform', 'Ops', 'Growth', 'Research'];
const owners = ['Anika', 'Roman', 'Mira', 'Dev', 'Kaito', 'Sofia'];
const statuses: TaskStatus[] = ['Backlog', 'Ready', 'Doing', 'Review', 'Done', 'Blocked'];
const kinds: LinkKind[] = ['blocks', 'depends-on', 'relates', 'handoff'];

const makeTask = (index: number): Task => {
  const id = `task-${String(index).padStart(3, '0')}`;
  const parentIndex = index > 7 ? Math.floor((index - 2) / 3) : null;
  const childIds = [index * 3 + 2, index * 3 + 3, index * 3 + 4]
    .filter((value) => value < TOTAL_TASKS)
    .map((value) => `task-${String(value).padStart(3, '0')}`);

  return {
    id,
    index,
    title: `${['Shape', 'Review', 'Ship', 'Trace', 'Polish', 'Map'][index % 6]} workflow ${index + 1}`,
    summary: [
      'Clarify ownership and remove noisy handoffs before the next review.',
      'Keep dependent work visible without turning the page into a wall of tasks.',
      'Prepare the next decision point and call out any blocked relationships.',
      'Tighten the execution path so nearby work stays easy to scan.',
    ][index % 4],
    status: statuses[index % statuses.length],
    owner: owners[index % owners.length],
    team: teams[index % teams.length],
    memberName: owners[index % owners.length],
    teamName: teams[index % teams.length],
    priority: index % 5 === 0 ? 'High' : index % 3 === 0 ? 'Medium' : 'Low',
    progress: 12 + ((index * 17) % 88),
    parentId: parentIndex === null ? null : `task-${String(parentIndex).padStart(3, '0')}`,
    childIds,
    updatedAt: `${2 + (index % 9)}h ago`,
  };
};

const makeStoryForTask = (task: Task): TaskStory[] => {
  const stories: TaskStory[] = [];
  const depths = [2, 3];

  for (const depth of depths) {
    const originIndex = task.index - depth * 2;
    if (originIndex < 0) continue;
    const ids = Array.from({ length: depth + 1 }, (_, offset) => originIndex + offset * 2)
      .filter((index) => index >= 0 && index < TOTAL_TASKS)
      .map((index) => `task-${String(index).padStart(3, '0')}`);

    if (ids.length < 2) continue;

    stories.push({
      id: `story-${task.id}-${depth}`,
      originId: ids[0],
      terminalId: task.id,
      pathTaskIds: ids,
      pathLinkTypes: ids.slice(1).map((_, index) => kinds[(task.index + index) % kinds.length]),
      depth,
    });
  }

  for (const depth of depths) {
    const terminalIndex = task.index + depth * 3;
    if (terminalIndex >= TOTAL_TASKS) continue;
    const ids = Array.from({ length: depth + 1 }, (_, offset) => task.index + offset * 3)
      .filter((index) => index >= 0 && index < TOTAL_TASKS)
      .map((index) => `task-${String(index).padStart(3, '0')}`);

    if (ids.length < 2) continue;

    stories.push({
      id: `story-out-${task.id}-${depth}`,
      originId: task.id,
      terminalId: ids[ids.length - 1],
      pathTaskIds: ids,
      pathLinkTypes: ids.slice(1).map((_, index) => kinds[(task.index + index + 1) % kinds.length]),
      depth,
    });
  }

  return stories;
};

const makeLinksForTask = (task: Task): TaskLink[] => {
  const links: TaskLink[] = [];
  const candidates = [
    task.index + 5,
    task.index + 13,
    task.index - 8,
    task.index + 29,
  ].filter((index) => index >= 0 && index < TOTAL_TASKS);

  for (const [offset, target] of candidates.entries()) {
    links.push({
      id: `${task.id}-${target}-${offset}`,
      fromId: offset === 2 ? `task-${String(target).padStart(3, '0')}` : task.id,
      toId: offset === 2 ? task.id : `task-${String(target).padStart(3, '0')}`,
      kind: kinds[(task.index + offset) % kinds.length],
    });
  }

  return links;
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const clampPage = (page: number) =>
  Math.max(0, Math.min(Math.ceil(TOTAL_TASKS / PAGE_SIZE) - 1, page));

export const pageForTask = (taskId: string) => {
  const index = Number(taskId.replace('task-', ''));
  return Number.isFinite(index) ? clampPage(Math.floor(index / PAGE_SIZE)) : 0;
};

export const defaultTaskId = 'task-000';

export async function fetchTaskPage(page: number): Promise<TaskPage> {
  await delay(120);
  const safePage = clampPage(page);
  const start = safePage * PAGE_SIZE;
  const tasks = Array.from({ length: PAGE_SIZE }, (_, offset) => start + offset)
    .filter((index) => index < TOTAL_TASKS)
    .map(makeTask);
  const taskIds = new Set(tasks.map((task) => task.id));
  const links = tasks
    .flatMap(makeLinksForTask)
    .filter((link) => taskIds.has(link.fromId) || taskIds.has(link.toId));
  const stories = tasks.flatMap(makeStoryForTask);

  return {
    tasks,
    links,
    stories,
    page: safePage,
    hasPrevious: safePage > 0,
    hasNext: start + PAGE_SIZE < TOTAL_TASKS,
  };
}

export async function fetchTaskById(taskId: string): Promise<Task> {
  await delay(60);
  const index = Number(taskId.replace('task-', ''));
  return makeTask(Number.isFinite(index) ? Math.max(0, Math.min(TOTAL_TASKS - 1, index)) : 0);
}
