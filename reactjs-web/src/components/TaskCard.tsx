import { ArrowRight, GitBranch, Link2, UserRound, UsersRound } from 'lucide-react';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  active?: boolean;
  muted?: boolean;
  linkCount?: number;
  storyCount?: number;
  onOpen: (task: Task) => void;
}

export function TaskCard({ task, active, muted, linkCount = 0, storyCount = 0, onOpen }: TaskCardProps) {
  return (
    <button
      className={`task-card ${active ? 'active' : ''} ${muted ? 'muted' : ''}`}
      type="button"
      onClick={() => onOpen(task)}
    >
      <div className="task-card-top">
        <span className={`status ${task.status.toLowerCase().replace('-', '')}`}>{task.status}</span>
        <span>{task.updatedAt}</span>
      </div>
      <strong>{task.title}</strong>
      <p>{task.summary}</p>
      <div className="task-card-people">
        <span>
          <UsersRound size={14} />
          {task.teamName}
        </span>
        <span>
          <UserRound size={14} />
          {task.memberName}
        </span>
      </div>
      <div className="task-meta">
        <span>
          <Link2 size={14} />
          {linkCount} direct
        </span>
        <span>
          <GitBranch size={14} />
          {storyCount} paths
        </span>
        <ArrowRight size={15} />
      </div>
      <div className="progress-track">
        <span style={{ width: `${task.progress}%` }} />
      </div>
    </button>
  );
}
