import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { TaskGraph } from '../Graph/TaskGraph';
import { ChevronLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

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

  const { data: neighbourhood, isLoading: isNeighbourLoading } = useQuery({
    queryKey: ['neighbourhood', taskId],
    queryFn: () => taskApi.getTaskNeighbourhood(taskId),
  });

  if (isTaskLoading || isNeighbourLoading || !task) {
    return (
      <div className="p-20 text-text-dim text-center">
        Loading Task Details...
      </div>
    );
  }

  const incomingLinks = neighbourhood?.edges.filter(e => e.targetTaskId === taskId) || [];
  const outgoingLinks = neighbourhood?.edges.filter(e => e.sourceTaskId === taskId) || [];

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
            
            {/* Direct Links Table */}
            <section className="flex flex-col gap-4">
              <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-widest">
                Direct Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Incoming (Left) */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-text-dim mb-1 font-semibold uppercase tracking-wider">
                    <ArrowDownLeft size={12} className="text-incoming" /> Incoming
                  </div>
                  {incomingLinks.length === 0 && (
                    <div className="text-xs text-text-dim italic p-4 border border-dashed border-border-notion rounded-xl">No incoming links.</div>
                  )}
                  {incomingLinks.map(edge => (
                    <DependencyLink key={edge.id} edge={edge} direction="incoming" neighbourhood={neighbourhood!} />
                  ))}
                </div>

                {/* Outgoing (Right) */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-text-dim mb-1 font-semibold uppercase tracking-wider">
                    Outgoing <ArrowUpRight size={12} className="text-outgoing" />
                  </div>
                  {outgoingLinks.length === 0 && (
                    <div className="text-xs text-text-dim italic p-4 border border-dashed border-border-notion rounded-xl">No outgoing links.</div>
                  )}
                  {outgoingLinks.map(edge => (
                    <DependencyLink key={edge.id} edge={edge} direction="outgoing" neighbourhood={neighbourhood!} />
                  ))}
                </div>
              </div>
            </section>

            {/* Task Link Graph Section */}
            <section className="flex flex-col gap-4 w-full overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-text-dim uppercase tracking-widest">
                  Task Link Graph
                </h3>
                <span className="text-[10px] text-text-dim font-medium px-2 py-0.5 bg-bg-secondary rounded">Link Context</span>
              </div>
              <div className="border border-border-notion rounded-2xl overflow-hidden bg-bg-secondary shadow-sm w-full">
                {neighbourhood && <TaskGraph neighbourhood={neighbourhood} />}
              </div>
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
    </div>
  );
};

const DependencyLink: React.FC<{ edge: any, direction: 'incoming' | 'outgoing', neighbourhood: any }> = ({ edge, direction, neighbourhood }) => {
  const otherId = direction === 'outgoing' ? edge.targetTaskId : edge.sourceTaskId;
  const otherTask = neighbourhood.nodes.find((n: any) => n.task.id === otherId)?.task;

  if (!otherTask) return null;

  return (
    <Link 
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: otherTask.projectId, taskId: otherId }}
      className="group flex items-center justify-between p-3 rounded-lg border border-border-notion bg-bg-secondary hover:bg-bg-notion hover:border-focus-blue transition-all duration-200"
    >
      <span className="font-semibold text-xs truncate flex-1 group-hover:text-focus-blue">{otherTask.title}</span>
      <span className="text-[9px] font-bold text-text-dim bg-white/50 px-2 py-0.5 rounded border border-border-notion/30">
        {edge.label}
      </span>
    </Link>
  );
};

const MetadataRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center pt-3 first:pt-0">
    <span className="text-text-dim text-xs font-medium">{label}</span>
    <span className="font-semibold text-text-notion">{value}</span>
  </div>
);
