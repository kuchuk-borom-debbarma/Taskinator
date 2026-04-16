import React from 'react';
import type { ProjectTask } from '../../api/types';
import { Link } from '@tanstack/react-router';
import { Circle, CheckCircle2, Clock } from 'lucide-react';

interface TaskListViewProps {
  tasks: ProjectTask[];
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks }) => {
  const groupedTasks = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter(t => t.status === 'DONE'),
  };

  return (
    <div className="flex flex-col gap-10 px-6 py-10 md:px-16 w-full max-w-5xl mx-auto">
      <header>
        <h1 className="text-4xl font-extrabold tracking-tight text-text-notion mb-2">Tasks</h1>
        <p className="text-text-dim text-lg">Manage your project dependencies and progress.</p>
      </header>

      <div className="flex flex-col gap-12">
        <TaskGroup title="To Do" tasks={groupedTasks.TODO} icon={<Circle size={14} className="text-todo" />} />
        <TaskGroup title="In Progress" tasks={groupedTasks.IN_PROGRESS} icon={<Clock size={14} className="text-incoming" />} />
        <TaskGroup title="Done" tasks={groupedTasks.DONE} icon={<CheckCircle2 size={14} className="text-done" />} />
      </div>
    </div>
  );
};

const TaskGroup: React.FC<{ title: string, tasks: ProjectTask[], icon: React.ReactNode }> = ({ title, tasks, icon }) => (
  <section className="flex flex-col gap-4">
    <div className="flex items-center gap-2 pb-2 border-b border-border-notion">
      {icon}
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-notion">{title}</h2>
      <span className="text-xs text-text-dim ml-1">{tasks.length}</span>
    </div>
    
    <div className="divide-y divide-border-notion">
      {tasks.length === 0 && (
        <div className="py-4 px-2 text-sm text-text-dim italic">No tasks in this group.</div>
      )}
      {tasks.map(task => (
        <Link 
          key={task.id} 
          to="/projects/$projectId/tasks/$taskId"
          params={{ projectId: task.projectId, taskId: task.id }}
          className="group flex items-center justify-between py-3 px-2 text-sm transition-all duration-150 hover:bg-bg-secondary rounded-md"
        >
          <span className="font-medium group-hover:text-focus-blue">{task.title}</span>
          <span className="text-[11px] text-text-dim">
            {new Date(task.updatedAt).toLocaleDateString()}
          </span>
        </Link>
      ))}
    </div>
  </section>
);
