import { ArrowRight, FolderKanban, GitBranch, Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { Project, Task, TaskNetwork, TaskPath, Team } from '../types';

export function TaskTrailView({
  project,
  tasks,
  focusedTask,
  network,
  loadingTasks,
  loadedTaskCount,
  loadedPageCount,
  hasPrevious,
  hasNext,
  onPage,
  onOpenTask,
  onOpenCreateTask,
  onOpenCreateLink,
  onOpenCreateTeam,
  onStatusChange,
  teams,
}: {
  project: Project | null;
  tasks: Task[];
  focusedTask: Task | null;
  network: TaskNetwork | null;
  loadingTasks: boolean;
  loadedTaskCount: number;
  loadedPageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPage: (direction: -1 | 1) => void;
  onOpenTask: (taskId: string) => void;
  onOpenCreateTask: () => void;
  onOpenCreateLink: () => void;
  onOpenCreateTeam: () => void;
  onStatusChange: (status: string) => void;
  teams: Team[];
}) {
  return (
    <section className="trail-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{project?.name ?? 'Workspace'}</p>
          <h1>Task network</h1>
        </div>
        <div className="top-actions">
          <button className="icon-button wide" type="button" onClick={onOpenCreateTeam}><FolderKanban size={15} />Team</button>
          <button className="icon-button wide" type="button" onClick={onOpenCreateTask}><Plus size={15} />Task</button>
          <button className="icon-button wide dark" type="button" onClick={onOpenCreateLink}><GitBranch size={15} />Link</button>
        </div>
      </header>

      <div className="trail-toolbar">
        <div>
          <p className="eyebrow">Live system</p>
          <h2>Graph-first task workspace</h2>
        </div>
        <div className="window-meter">
          <span>{loadedTaskCount} tasks</span>
          <span>{loadedPageCount} pages warm</span>
        </div>
      </div>

      <div className="task-stage simple">
        <section className="lane task-index-panel">
          <div className="lane-title">Task window</div>
          <p className="panel-help">Paginated task list. Old pages leave memory.</p>
          <div className="scroll-list">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} active={task.id === focusedTask?.id} onOpen={onOpenTask} />
            ))}
            {loadingTasks ? <div className="empty-card small">Loading tasks</div> : null}
          </div>
          <div className="pager-row">
            <button className="page-button" type="button" disabled={!hasPrevious} onClick={() => onPage(-1)}>Previous</button>
            <button className="page-button" type="button" disabled={!hasNext} onClick={() => onPage(1)}>Next</button>
          </div>
        </section>

        <section className="focus-lane">
          {focusedTask ? (
            <>
              <div className="path-strip">
                <span>Focused task</span>
                <strong>{focusedTask.title}</strong>
                <button type="button" onClick={onOpenCreateLink}>Add connection</button>
              </div>

              <div className="focus-card">
                <div className="focus-cover">
                  <img
                    src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
                    alt="Planning table"
                  />
                  <span>{focusedTask.status}</span>
                </div>
                <div className="focus-body">
                  <h3>{focusedTask.title}</h3>
                  <p>{focusedTask.description || 'No task description yet.'}</p>
                  <div className="focus-grid">
                    <div><span>Owner</span><strong>{focusedTask.assignee?.username ?? 'Unassigned'}</strong></div>
                    <div><span>Team</span><strong>{focusedTask.team?.name ?? 'No team'}</strong></div>
                    <div><span>Links</span><strong>{focusedTask.links?.length ?? 0}</strong></div>
                  </div>
                  <div className="focus-controls">
                    <label>
                      Status
                      <select value={focusedTask.status} onChange={(event) => onStatusChange(event.target.value)}>
                        {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Team
                      <select value={focusedTask.teamId ?? ''} disabled>
                        <option value="">No team</option>
                        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-card">Pick task from window.</div>
          )}
        </section>

        <section className="connected-band">
          <div className="connected-band-header">
            <div>
              <div className="lane-title">
                <GitBranch size={16} />
                Connected network
              </div>
              <p className="panel-help">Incoming ends at focused task. Outgoing starts from focused task.</p>
            </div>
          </div>
          <div className="connected-grid">
            <PathGroup title="Incoming" paths={network?.incoming ?? []} focusId={focusedTask?.id} onOpenTask={onOpenTask} />
            <PathGroup title="Outgoing" paths={network?.outgoing ?? []} focusId={focusedTask?.id} onOpenTask={onOpenTask} />
          </div>
        </section>
      </div>
    </section>
  );
}

function PathGroup({
  title,
  paths,
  focusId,
  onOpenTask,
}: {
  title: string;
  paths: TaskPath[];
  focusId?: string | null;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <div className="path-group">
      <div className="path-group-title"><h4>{title}</h4></div>
      {paths.length === 0 ? <p className="quiet">No paths here.</p> : null}
      {paths.map((path) => (
        <div className="materialized-row" key={path.id}>
          <span className="path-depth">{path.depth} levels</span>
          <div className="path-chain">
            {(path.pathTasks ?? []).map((task, index) => (
              <span className="path-segment" key={`${path.id}-${task.id}`}>
                <button className={task.id === focusId ? 'focus-node' : ''} type="button" onClick={() => onOpenTask(task.id)}>
                  {shortName(task.title)}
                </button>
                {index < (path.pathLinkLabels?.length ?? 0) ? <em>{path.pathLinkLabels[index]}</em> : null}
              </span>
            ))}
            <ArrowRight size={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

function shortName(title: string) {
  return title.replace(' workflow ', ' ');
}
