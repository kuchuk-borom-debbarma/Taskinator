import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { TaskMap } from '../Graph/TaskMap';
import { TaskMapModal } from '../Graph/TaskMapModal';
import { ChevronLeft, Info, Calendar, Link as LinkIcon, Hash, Type, Map } from 'lucide-react';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();
  const [isMapOpen, setIsMapOpen] = useState(false);

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  if (isTaskLoading || !task) {
    return (
      <div className="p-20 text-text-dim text-center animate-pulse font-medium tracking-tight">
        Loading task details...
      </div>
    );
  }

  const statusColor = task.status === 'DONE' ? 'var(--color-done)' : task.status === 'IN_PROGRESS' ? 'var(--color-incoming)' : 'var(--color-todo)';

  return (
    <div className="w-full min-h-screen bg-bg-notion flex flex-col items-center overflow-x-hidden selection:bg-focus-blue/10 selection:text-focus-blue">
      <div className="w-full max-w-5xl px-8 py-12 flex flex-col gap-10">
        
        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <button 
            onClick={onClose} 
            className="flex items-center gap-1.5 text-text-dim text-[13px] font-semibold py-1 px-2 rounded-md -ml-2 hover:bg-bg-secondary hover:text-text-notion transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="w-px h-3 bg-border-notion mx-1" />
          <span className="text-[13px] font-medium text-text-dim opacity-60">Task Detail</span>
        </nav>

        {/* Minimal Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: statusColor }}
            >
              {task.status}
            </div>
            <span className="text-text-dim text-[11px] font-medium tracking-tight opacity-40">
              #{task.id.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-[32px] font-bold tracking-tight text-text-notion leading-tight">
            {task.title}
          </h1>
        </header>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 items-start">
          <div className="flex flex-col gap-10 min-w-0">
            
            {/* Description */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-text-dim uppercase tracking-wider">
                <Type size={14} /> Description
              </div>
              <p className="text-[16px] leading-relaxed text-text-notion opacity-90">
                {task.description || "No description provided."}
              </p>
            </section>

            {/* Content Area */}
            <section className="min-h-[240px] p-8 border border-border-notion rounded-xl bg-bg-secondary/50 flex flex-col items-center justify-center gap-4 text-center">
              <div className="p-4 rounded-lg bg-white border border-border-notion text-text-dim">
                <Info size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-text-notion font-bold text-sm">Editor Workspace</span>
                <span className="text-text-dim text-xs">Collaboration and rich text content appears here.</span>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="p-5 rounded-xl border border-border-notion bg-white shadow-sm flex flex-col gap-5">
              <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Properties</div>
              
              <div className="flex flex-col gap-4 divide-y divide-border-notion">
                <PropertyRow icon={<Calendar size={13} />} label="Created" value={new Date(task.createdAt).toLocaleDateString()} />
                <PropertyRow icon={<LinkIcon size={13} />} label="Version" value={`${task.version}.0`} />
                <PropertyRow icon={<Hash size={13} />} label="Context" value="Production" />
              </div>
            </div>

            <button 
              onClick={() => setIsMapOpen(true)}
              className="w-full py-2.5 px-4 rounded-lg bg-white border border-border-notion text-text-notion text-[13px] font-bold hover:bg-bg-secondary transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
            >
              <Map size={14} className="text-focus-blue" />
              Open Task Map
            </button>
          </aside>
        </div>
      </div>

      <TaskMapModal 
        isOpen={isMapOpen} 
        onClose={() => setIsMapOpen(false)} 
        title={task.title}
      >
        <TaskMap taskId={taskId} />
      </TaskMapModal>

      <footer className="w-full max-w-5xl px-8 py-12 flex justify-between items-center opacity-30 mt-auto">
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Taskinator • Minimal</div>
      </footer>
    </div>
  );
};

const PropertyRow: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex justify-between items-center pt-4 first:pt-0">
    <div className="flex items-center gap-2 text-text-dim">
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </div>
    <span className="font-bold text-text-notion text-[12px]">{value}</span>
  </div>
);
