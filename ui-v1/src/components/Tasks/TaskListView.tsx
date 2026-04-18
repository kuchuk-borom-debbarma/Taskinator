import React from 'react';
import type { ProjectTask, TaskLink } from '../../api/types';
import { Link } from '@tanstack/react-router';
import { Circle, CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { getLinkLabelColor } from '../../utils/color';

interface TaskListViewProps {
  tasks: ProjectTask[];
  links: TaskLink[];
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, links }) => {
  const groupedTasks = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter(t => t.status === 'DONE'),
  };

  return (
    <div className="flex flex-col gap-10 px-6 py-10 md:px-16 w-full max-w-5xl mx-auto text-slate-100">
      <header>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Tasks</h1>
        <p className="text-slate-300/80 text-lg">Manage your project dependencies and progress.</p>
      </header>

      <div className="flex flex-col gap-12">
        <TaskGroup title="To Do" tasks={groupedTasks.TODO} links={links} allTasks={tasks} icon={<Circle size={14} className="text-todo" />} />
        <TaskGroup title="In Progress" tasks={groupedTasks.IN_PROGRESS} links={links} allTasks={tasks} icon={<Clock size={14} className="text-incoming" />} />
        <TaskGroup title="Done" tasks={groupedTasks.DONE} links={links} allTasks={tasks} icon={<CheckCircle2 size={14} className="text-done" />} />
      </div>
    </div>
  );
};

const TaskGroup: React.FC<{ 
  title: string, 
  tasks: ProjectTask[], 
  links: TaskLink[], 
  allTasks: ProjectTask[],
  icon: React.ReactNode 
}> = ({ title, tasks, links, allTasks, icon }) => (
  <section className="flex flex-col gap-4">
    <div className="flex items-center gap-2 pb-2 border-b border-white/8">
      {icon}
      <h2 className="text-xs font-bold uppercase tracking-widest text-white/90">{title}</h2>
      <span className="text-xs text-slate-400 ml-1">{tasks.length}</span>
    </div>
    
    <div className="space-y-3">
      {tasks.map(task => {
        // Find direct links for this task
        const incomingLinks = links.filter(l => l.targetTaskId === task.id);
        const outgoingLinks = links.filter(l => l.sourceTaskId === task.id);

        // Group by label for each direction
        const groupLabel = (linksArr: TaskLink[], type: 'source' | 'target') => {
          const grouped: Record<string, ProjectTask[]> = {};
          linksArr.forEach(link => {
            const taskId = type === 'source' ? link.sourceTaskId : link.targetTaskId;
            const t = allTasks.find(at => at.id === taskId);
            if (t) {
              if (!grouped[link.label]) grouped[link.label] = [];
              grouped[link.label].push(t);
            }
          });
          return grouped;
        };

        const incomingByLabel = groupLabel(incomingLinks, 'source');
        const outgoingByLabel = groupLabel(outgoingLinks, 'target');

        return (
          <Link 
            key={task.id} 
            to="/projects/$projectId/tasks/$taskId"
            params={{ projectId: task.projectId, taskId: task.id }}
            className="group glass-card-dark flex items-start justify-between py-5 px-4 text-sm transition-all duration-150 hover:bg-slate-800/70 hover:border-white/12 rounded-2xl"
          >
            <div className="flex flex-col gap-3 flex-1 overflow-hidden">
              <span className="font-bold text-white group-hover:text-blue-300 text-base leading-tight">{task.title}</span>
              
              <div className="flex flex-col gap-2.5">
                {Object.keys(incomingByLabel).length > 0 && (
                  <div className="flex items-start gap-2">
                    <ArrowDownLeft size={12} className="text-slate-400 mt-1 shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      {Object.entries(incomingByLabel).map(([label, ts]) => (
                        <div key={label} className="flex flex-wrap items-center gap-1.5 min-h-[22px]">
                          <span 
                            className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shrink-0"
                            style={{ backgroundColor: getLinkLabelColor(label) }}
                          >
                            {label}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {ts.map(t => (
                              <div key={t.id} className="flex items-center gap-1.5 px-2 py-0.5 bg-white/8 border border-white/10 rounded text-[10px] text-white/85 shadow-sm whitespace-nowrap">
                                <StatusIcon status={t.status} size={10} />
                                <span className="max-w-[120px] truncate">{t.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(outgoingByLabel).length > 0 && (
                  <div className="flex items-start gap-2">
                    <ArrowUpRight size={12} className="text-slate-400 mt-1 shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      {Object.entries(outgoingByLabel).map(([label, ts]) => (
                        <div key={label} className="flex flex-wrap items-center gap-1.5 min-h-[22px]">
                          <span 
                            className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white shrink-0"
                            style={{ backgroundColor: getLinkLabelColor(label) }}
                          >
                            {label}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {ts.map(t => (
                              <div key={t.id} className="flex items-center gap-1.5 px-2 py-0.5 bg-white/8 border border-white/10 rounded text-[10px] text-white/85 shadow-sm whitespace-nowrap">
                                <StatusIcon status={t.status} size={10} />
                                <span className="max-w-[120px] truncate">{t.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <span className="text-[11px] text-slate-300/80 font-bold mt-1 px-2.5 py-1 bg-white/8 border border-white/8 rounded-full shrink-0">
              {new Date(task.updatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
            </span>
          </Link>
        );
      })}
    </div>
  </section>
);

const StatusIcon: React.FC<{ status: string, size?: number }> = ({ status, size = 14 }) => {
  switch (status) {
    case 'DONE': return <CheckCircle2 size={size} className="text-done" />;
    case 'IN_PROGRESS': return <Clock size={size} className="text-incoming" />;
    default: return <Circle size={size} className="text-todo" />;
  }
};
