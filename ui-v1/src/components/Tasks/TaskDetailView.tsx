import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { TaskRadialNexus } from '../Graph/TaskRadialNexus';
import { NexusModal } from '../Graph/NexusModal';
import { ChevronLeft, Info, Calendar, History, Hash, Terminal, Orbit } from 'lucide-react';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();
  const [isNexusOpen, setIsNexusOpen] = useState(false);

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  if (isTaskLoading || !task) {
    return (
      <div className="p-20 text-text-dim text-center animate-pulse font-medium tracking-tight">
        Synchronising Task Context...
      </div>
    );
  }

  const statusColor = task.status === 'DONE' ? 'var(--color-done)' : task.status === 'IN_PROGRESS' ? 'var(--color-incoming)' : 'var(--color-todo)';

  return (
    <div className="w-full min-h-screen bg-bg-notion flex flex-col items-center overflow-x-hidden selection:bg-focus-blue/10 selection:text-focus-blue">
      <div className="w-full max-w-6xl px-8 py-12 flex flex-col gap-10">
        
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center gap-2 group">
          <button 
            onClick={onClose} 
            className="flex items-center gap-1.5 text-text-dim text-[13px] font-semibold py-1.5 px-3 rounded-xl -ml-3 hover:bg-bg-secondary hover:text-text-notion transition-all duration-300 active:scale-95"
          >
            <ChevronLeft size={16} />
            Back to Project
          </button>
          <div className="w-px h-4 bg-border-notion mx-2" />
          <span className="text-[13px] font-bold text-text-dim uppercase tracking-widest opacity-60">Task Detail</span>
        </nav>

        {/* Premium Header */}
        <header className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500"
              style={{ backgroundColor: `${statusColor}15`, color: statusColor, boxShadow: `0 0 20px ${statusColor}10` }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
              {task.status}
            </div>
            <span className="text-text-dim text-[12px] font-medium tracking-tight opacity-50">
              {task.id.toUpperCase()}
            </span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-text-notion leading-[1.1] max-w-4xl drop-shadow-sm">
            {task.title}
          </h1>
        </header>

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-16 items-start">
          <div className="flex flex-col gap-12 min-w-0">
            
            {/* Description Card */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[11px] font-black text-text-dim uppercase tracking-[0.2em] mb-1">
                <Info size={14} /> Description
              </div>
              <p className="text-[17px] leading-relaxed text-text-notion font-medium opacity-90 max-w-2xl">
                {task.description || "No description provided for this mission."}
              </p>
            </section>

            {/* Content Canvas Placeholder */}
            <section className="relative min-h-[320px] p-10 border border-border-notion rounded-[2.5rem] bg-bg-secondary/40 flex flex-col items-center justify-center gap-6 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-focus-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="p-5 rounded-full bg-white shadow-premium border border-border-notion relative z-10 transition-transform duration-500 group-hover:scale-110">
                <Terminal size={32} className="text-focus-blue" />
              </div>
              <div className="flex flex-col items-center gap-2 relative z-10 text-center">
                <span className="text-text-notion font-black text-sm uppercase tracking-widest">Workspace Canvas</span>
                <span className="text-text-dim text-xs font-semibold max-w-[200px]">Rich context, subtasks and documentation flow here</span>
              </div>
            </section>
          </div>

          {/* Inspector Sidebar */}
          <aside className="flex flex-col gap-8 lg:sticky lg:top-12">
            
            {/* Context Module */}
            <div className="p-6 rounded-3xl border border-border-notion bg-white shadow-premium flex flex-col gap-6">
              <div className="text-[11px] font-black text-text-dim uppercase tracking-[0.2em] flex items-center gap-2">
                <Terminal size={12} /> System Context
              </div>
              
              <div className="flex flex-col gap-5 divide-y divide-border-notion/50">
                <InspectorRow icon={<Calendar size={14} />} label="Created" value={new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} />
                <InspectorRow icon={<History size={14} />} label="Last Activity" value="2 hours ago" />
                <InspectorRow icon={<Hash size={14} />} label="Revision" value={`v${task.version}.0`} />
              </div>
            </div>

            {/* Quick Actions Placeholder */}
            <div className="flex flex-col gap-3">
              <button className="w-full py-4 px-6 rounded-2xl bg-text-notion text-white text-[13px] font-black uppercase tracking-widest hover:bg-focus-blue transition-all duration-300 shadow-lg active:scale-95">
                Execute Mission
              </button>
              
              <button 
                onClick={() => setIsNexusOpen(true)}
                className="w-full py-4 px-6 rounded-2xl bg-white border border-focus-blue text-focus-blue text-[13px] font-black uppercase tracking-widest hover:bg-focus-blue/5 transition-all duration-300 shadow-sm active:scale-95 flex items-center justify-center gap-3 group"
              >
                <Orbit size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                Manifest Neural Nexus
              </button>

              <button className="w-full py-4 px-6 rounded-2xl border border-border-notion text-text-dim text-[13px] font-black uppercase tracking-widest hover:bg-bg-secondary hover:text-text-notion transition-all duration-300 active:scale-95">
                Archived Context
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Nexus Modal Overlay */}
      <NexusModal 
        isOpen={isNexusOpen} 
        onClose={() => setIsNexusOpen(false)} 
        title={`${task.title} Lineage`}
      >
        <TaskRadialNexus taskId={taskId} />
      </NexusModal>

      <footer className="w-full max-w-6xl px-8 py-20 flex justify-between items-center opacity-30">
        <div className="text-[11px] font-bold uppercase tracking-widest text-text-dim">Taskinator Orchestrator • 2.0</div>
        <div className="text-[10px] font-medium text-text-dim">SECURE_MISSION_LOG_ACTIVE</div>
      </footer>
    </div>
  );
};

const InspectorRow: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex justify-between items-center pt-5 first:pt-0 group">
    <div className="flex items-center gap-3">
      <div className="text-text-dim opacity-50 group-hover:opacity-100 group-hover:text-focus-blue transition-all duration-300">
        {icon}
      </div>
      <span className="text-text-dim text-[11px] font-bold uppercase tracking-widest">{label}</span>
    </div>
    <span className="font-bold text-text-notion text-[13px] tracking-tight">{value}</span>
  </div>
);
