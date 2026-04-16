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
    <div className="task-list" style={{ padding: '40px 60px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Tasks</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your project dependencies and progress.</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <TaskGroup title="To Do" tasks={groupedTasks.TODO} icon={<Circle size={14} color="var(--accent-todo)" />} />
        <TaskGroup title="In Progress" tasks={groupedTasks.IN_PROGRESS} icon={<Clock size={14} color="var(--accent-incoming)" />} />
        <TaskGroup title="Done" tasks={groupedTasks.DONE} icon={<CheckCircle2 size={14} color="var(--accent-done)" />} />
      </section>
    </div>
  );
};

const TaskGroup: React.FC<{ title: string, tasks: ProjectTask[], icon: React.ReactNode }> = ({ title, tasks, icon }) => (
  <div className="task-group">
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
      {icon}
      <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{tasks.length}</span>
    </div>
    
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {tasks.length === 0 && (
        <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>No tasks in this group.</div>
      )}
      {tasks.map(task => (
        <Link 
          key={task.id} 
          to="/projects/$projectId/tasks/$taskId"
          params={{ projectId: task.projectId, taskId: task.id }}
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'background 0.1s',
          }}
          className="task-row"
        >
          <span style={{ fontWeight: 500 }}>{task.title}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {new Date(task.updatedAt).toLocaleDateString()}
          </span>
        </Link>
      ))}
    </div>

    <style>{`
      .task-row:hover {
        background-color: var(--bg-secondary);
      }
    `}</style>
  </div>
);
