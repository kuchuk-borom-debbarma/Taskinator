import { ArrowDownLeft, ArrowUpRight, ChevronLeft, GitBranch, Rows3 } from 'lucide-react';
import type { Task, TaskLink, TaskStory } from '../types';
import { TaskCard } from './TaskCard';

interface TaskTrailViewProps {
  tasks: Task[];
  taskMap: Map<string, Task>;
  links: TaskLink[];
  stories: TaskStory[];
  focusedTask: Task | null;
  hasPrevious: boolean;
  hasNext: boolean;
  loading: boolean;
  loadedTaskCount: number;
  loadedPageCount: number;
  onOpenTask: (task: Task) => void;
  onPage: (direction: -1 | 1) => void;
}

export function TaskTrailView({
  tasks,
  taskMap,
  links,
  stories,
  focusedTask,
  hasPrevious,
  hasNext,
  loading,
  loadedTaskCount,
  loadedPageCount,
  onOpenTask,
  onPage,
}: TaskTrailViewProps) {
  const focus = focusedTask ?? tasks[0] ?? null;
  const incomingStories = focus ? stories.filter((story) => story.terminalId === focus.id).slice(0, 5) : [];
  const outgoingStories = focus ? stories.filter((story) => story.originId === focus.id).slice(0, 5) : [];
  const linkCountByTask = countLinksByTask(links);
  const storyCountByTask = countStoriesByTask(stories);
  const nearby = focus
    ? tasks.filter((task) => task.id !== focus.id && Math.abs(task.index - focus.index) < 10)
    : tasks;
  const children = focus?.childIds.map((id) => taskMap.get(id)).filter((task): task is Task => Boolean(task)) ?? [];
  const parent = focus?.parentId ? taskMap.get(focus.parentId) : null;

  return (
    <section className="trail-shell">
      <div className="trail-toolbar">
        <div>
          <p className="eyebrow">First view format</p>
          <h2>Trail map keeps graph work nearby</h2>
        </div>
        <div className="window-meter">
          <Rows3 size={16} />
          <span>{loadedTaskCount} tasks</span>
          <span>{loadedPageCount} pages in memory</span>
        </div>
      </div>

      <div className="task-stage simple">
        <section className="lane task-index-panel">
          <div className="lane-title">
            <ChevronLeft size={17} />
            Window
          </div>
          <p className="panel-help">Nearby tasks only. Move window to load more.</p>
          <div className="scroll-list">
            {[focus, ...nearby].filter((task): task is Task => Boolean(task)).slice(0, 12).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                active={task.id === focus?.id}
                muted={task.status === 'Done'}
                linkCount={linkCountByTask.get(task.id) ?? 0}
                storyCount={storyCountByTask.get(task.id) ?? 0}
                onOpen={onOpenTask}
              />
            ))}
          </div>
          <div className="pager-row">
            <button className="page-button" type="button" disabled={!hasPrevious || loading} onClick={() => onPage(-1)}>
              Previous
            </button>
            <button className="page-button" type="button" disabled={!hasNext || loading} onClick={() => onPage(1)}>
              Next
            </button>
          </div>
        </section>

        <section className="focus-lane">
          {focus ? (
            <>
              <div className="path-strip">
                <span>Navigation path</span>
                {parent ? (
                  <button type="button" onClick={() => onOpenTask(parent)}>
                    {parent.title}
                  </button>
                ) : (
                  <em>No loaded parent</em>
                )}
                <strong>{focus.title}</strong>
                {children.slice(0, 3).map((task) => (
                  <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                    {task.title}
                  </button>
                ))}
              </div>

              <div className="focus-card">
                <div className="focus-cover">
                  <img
                    src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
                    alt="Team planning"
                  />
                  <span>{focus.priority} priority</span>
                </div>
                <div className="focus-body">
                  <span className={`status ${focus.status.toLowerCase().replace('-', '')}`}>{focus.status}</span>
                  <h3>{focus.title}</h3>
                  <p>{focus.summary}</p>
                  <div className="focus-grid">
                    <div>
                      <span>Owner</span>
                      <strong>{focus.memberName}</strong>
                    </div>
                    <div>
                      <span>Team</span>
                      <strong>{focus.teamName}</strong>
                    </div>
                    <div>
                      <span>Progress</span>
                      <strong>{focus.progress}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-card">Loading focus</div>
          )}
        </section>

        <section className="connected-band">
          <div className="connected-band-header">
            <div>
              <div className="lane-title">
                <GitBranch size={17} />
                Connected network
              </div>
              <p className="panel-help">Incoming and outgoing materialized paths from GraphQL story data.</p>
            </div>
          </div>
          <div className="connected-grid">
          <PathGroup
            title="Incoming"
            direction="incoming"
            stories={incomingStories}
            taskMap={taskMap}
            focusId={focus?.id}
            onOpenTask={onOpenTask}
          />
          <PathGroup
            title="Outgoing"
            direction="outgoing"
            stories={outgoingStories}
            taskMap={taskMap}
            focusId={focus?.id}
            onOpenTask={onOpenTask}
          />
          </div>
        </section>
      </div>
    </section>
  );
}

function countLinksByTask(links: TaskLink[]) {
  const counts = new Map<string, number>();
  for (const link of links) {
    counts.set(link.fromId, (counts.get(link.fromId) ?? 0) + 1);
    counts.set(link.toId, (counts.get(link.toId) ?? 0) + 1);
  }
  return counts;
}

function countStoriesByTask(stories: TaskStory[]) {
  const counts = new Map<string, number>();
  for (const story of stories) {
    for (const id of story.pathTaskIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

interface PathGroupProps {
  title: string;
  direction: 'incoming' | 'outgoing';
  stories: TaskStory[];
  taskMap: Map<string, Task>;
  focusId?: string;
  onOpenTask: (task: Task) => void;
}

function PathGroup({ title, direction, stories, taskMap, focusId, onOpenTask }: PathGroupProps) {
  return (
    <div className="path-group">
      <div className="path-group-title">
        {direction === 'incoming' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
        <h4>{title}</h4>
      </div>
      {stories.length === 0 ? (
        <p className="quiet">No visible materialized paths.</p>
      ) : (
        stories.map((story) => (
          <MaterializedPathRow
            key={story.id}
            story={story}
            taskMap={taskMap}
            direction={direction}
            focusId={focusId}
            onOpenTask={onOpenTask}
          />
        ))
      )}
    </div>
  );
}

function MaterializedPathRow({
  story,
  taskMap,
  direction,
  focusId,
  onOpenTask,
}: {
  story: TaskStory;
  taskMap: Map<string, Task>;
  direction: 'incoming' | 'outgoing';
  focusId?: string;
  onOpenTask: (task: Task) => void;
}) {
  const visible = compactPath(story, direction);

  return (
    <div className="materialized-row">
      <span className="path-depth">{story.depth} levels</span>
      <div className="path-chain" title={fullPathLabel(story, taskMap)}>
        {visible.startEllipsis ? <span className="path-ellipsis">...</span> : null}
        {visible.taskIds.map((id, index) => {
          const task = taskMap.get(id);
          const linkKind = visible.linkKinds[index];
          return (
            <span className="path-segment" key={`${story.id}-${id}`}>
              <button
                className={id === focusId ? 'focus-node' : ''}
                type="button"
                disabled={!task}
                onClick={() => task && onOpenTask(task)}
              >
                {shortTaskName(task?.title ?? id)}
              </button>
              {linkKind ? <em>{formatLinkKind(linkKind)}</em> : null}
            </span>
          );
        })}
        {visible.endEllipsis ? <span className="path-ellipsis">...</span> : null}
      </div>
    </div>
  );
}

function compactPath(story: TaskStory, direction: 'incoming' | 'outgoing') {
  const maxTasks = 4;
  const tooDeep = story.pathTaskIds.length > maxTasks;
  const taskIds = tooDeep
    ? direction === 'incoming'
      ? story.pathTaskIds.slice(-(maxTasks - 1))
      : story.pathTaskIds.slice(0, maxTasks - 1)
    : story.pathTaskIds;
  const linkOffset = tooDeep && direction === 'incoming' ? story.pathTaskIds.length - taskIds.length : 0;
  const linkKinds = taskIds.slice(1).map((_, index) => story.pathLinkTypes[index + linkOffset]);

  return {
    taskIds,
    linkKinds,
    startEllipsis: tooDeep && direction === 'incoming',
    endEllipsis: tooDeep && direction === 'outgoing',
  };
}

function fullPathLabel(story: TaskStory, taskMap: Map<string, Task>) {
  return story.pathTaskIds
    .map((id, index) => {
      const taskName = taskMap.get(id)?.title ?? id;
      const link = story.pathLinkTypes[index] ? `-${formatLinkKind(story.pathLinkTypes[index])}>` : '';
      return `${taskName}${link}`;
    })
    .join('');
}

function shortTaskName(name: string) {
  return name.replace(' workflow ', ' ');
}

function formatLinkKind(kind: TaskLink['kind']) {
  switch (kind) {
    case 'blocks':
      return 'Blocking';
    case 'depends-on':
      return 'Dependency';
    case 'handoff':
      return 'Handoff';
    case 'relates':
      return 'Related';
  }
}
