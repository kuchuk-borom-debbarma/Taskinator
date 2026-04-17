import { GitBranch, Link2, UserRound, UsersRound } from 'lucide-react';
import type { Task } from '../types';

export function TaskCard({
  task,
  active,
  onOpen,
}: {
  task: Task;
  active?: boolean;
  onOpen: (taskId: string) => void;
}) {
  return (
    <button className={active ? 'task-card active' : 'task-card'} type="button" onClick={() => onOpen(task.id)}>
      <div className="task-card-top">
        <span className={`status ${task.status.toLowerCase()}`}>{task.status}</span>
        <span>{timeLabel(task.updatedAt ?? task.createdAt)}</span>
      </div>
      <strong>{task.title}</strong>
      <p>{task.description || 'No description yet.'}</p>
      <div className="task-card-people">
        <span><UsersRound size={14} />{task.team?.name ?? 'Unassigned team'}</span>
        <span><UserRound size={14} />{task.assignee?.username ?? 'Open owner'}</span>
      </div>
      <div className="task-meta">
        <span><Link2 size={14} />{task.links?.length ?? 0} links</span>
        <span><GitBranch size={14} />{task.story?.length ?? 0} paths</span>
      </div>
    </button>
  );
}

function timeLabel(value?: string | null) {
  if (!value) return 'now';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  const diff = Math.max(1, Math.floor((Date.now() - date.valueOf()) / 3600000));
  return `${diff}h ago`;
}
