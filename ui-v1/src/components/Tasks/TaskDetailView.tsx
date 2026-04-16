import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { TaskDiscoveryTree } from '../Graph/TaskDiscoveryTree';
import { ChevronLeft } from 'lucide-react';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  if (isTaskLoading || !task) {
    return (
      <div className="p-20 text-text-dim text-center">
        Loading Task Details...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-bg-notion flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-6xl px-6 py-10 flex flex-col gap-8">
        <nav>
          <button 
            onClick={onClose} 
            className="flex items-center gap-1.5 text-text-dim text-sm font-medium py-1.5 px-3 rounded-md -ml-3 hover:bg-bg-secondary transition-colors"
          >
            <ChevronLeft size={18} />
            Back to list
          </button>
        </nav>

        <header>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded bg-bg-secondary text-text-dim text-[10px] font-bold uppercase tracking-wider">
              {task.status}
            </span>
            <span className="text-text-dim text-[13px]">
              Ref: {task.id.toUpperCase()}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-notion leading-tight">
            {task.title}
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">
          <div className="flex flex-col gap-12 min-w-0">
            {/* Main content area (reserved for future rich text or subtasks) */}
            <section className="min-h-[200px] p-8 border border-dashed border-border-notion rounded-3xl bg-bg-secondary/30 flex items-center justify-center">
              <span className="text-text-dim text-xs font-medium uppercase tracking-widest opacity-40">Workspace Content Canvas</span>
            </section>
          </div>

          <aside className="flex flex-col gap-10 lg:sticky lg:top-10">
            <section>
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-widest mb-3">
                Summary
              </h3>
              <p className="text-[15px] leading-relaxed text-text-notion">
                {task.description || "No description provided."}
              </p>
            </section>

            <section>
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-widest mb-4">
                Metadata
              </h3>
              <div className="flex flex-col gap-4 text-sm divide-y divide-border-notion/50">
                <MetadataRow label="Created" value={new Date(task.createdAt).toLocaleDateString()} />
                <MetadataRow label="Updated" value={new Date(task.updatedAt).toLocaleDateString()} />
                <MetadataRow label="Version" value={`v${task.version}`} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Strategic Lineage Section (Neural Orchard) - FULL WIDTH */}
      <section className="w-full py-16 bg-white/40 border-y border-border-notion/50 mt-8">
        <div className="max-w-6xl mx-auto px-6 mb-10">
          <div className="flex flex-col gap-1">
            <h3 className="text-[14px] font-extrabold text-text-notion uppercase tracking-widest">
              Strategic Lineage
            </h3>
            <p className="text-[11px] text-text-dim font-medium">Deep discovery of ancestors and successors</p>
          </div>
        </div>
        
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="min-w-fit">
            <TaskDiscoveryTree taskId={taskId} />
          </div>
        </div>
      </section>

      <div className="w-full max-w-6xl px-6 py-10">
        {/* Optional footer space */}
      </div>
    </div>
  );
};

const MetadataRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center pt-3 first:pt-0">
    <span className="text-text-dim text-xs font-medium">{label}</span>
    <span className="font-semibold text-text-notion">{value}</span>
  </div>
);
