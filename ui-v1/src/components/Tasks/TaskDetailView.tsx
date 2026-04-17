import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { TaskMap } from '../Graph/TaskMap';
import { TaskMapModal } from '../Graph/TaskMapModal';
import { ChevronLeft, Calendar, Map, Layers, Users, User, Clock, CheckCircle2, Type, Copy } from 'lucide-react';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  if (isTaskLoading || !task) {
    return (
      <div className="p-20 text-text-dim text-center animate-pulse font-medium tracking-tight h-screen flex items-center justify-center bg-bg-notion">
        Loading task properties...
      </div>
    );
  }

  // Mock lookups for Team and Member
  const getTeamName = (id?: string) => {
    if (!id) return null;
    const teams: Record<string, string> = { t1: 'Strategy & Brand', t2: 'Operations', t3: 'Design & Build', t4: 'Culinary' };
    return teams[id] || id;
  };

  const getMemberName = (id?: string) => {
    if (!id) return null;
    const members: Record<string, string> = { m1: 'Alex Chen', m2: 'Sarah Miller', m3: 'David K.' };
    return members[id] || id;
  };

  const getPriorityInfo = (p: number) => {
    const labels: Record<number, { label: string, color: string }> = {
      1: { label: 'Urgent', color: '#FF4444' },
      2: { label: 'High', color: '#FF8800' },
      3: { label: 'Medium', color: '#00AAFF' },
      4: { label: 'Low', color: '#888888' },
      5: { label: 'Backlog', color: '#CCCCCC' }
    };
    return labels[p] || { label: `P${p}`, color: '#888888' };
  };

  const getStatusInfo = (s: string) => {
    const statuses: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
      'TODO': { label: 'To Do', color: '#888888', icon: <div className="w-2.5 h-2.5 rounded-full border-2 border-current opacity-40" /> },
      'IN_PROGRESS': { label: 'In Progress', color: 'var(--color-focus-blue)', icon: <Clock size={13} className="text-focus-blue" /> },
      'DONE': { label: 'Done', color: 'var(--color-done)', icon: <CheckCircle2 size={13} className="text-done" /> }
    };
    return statuses[s] || { label: s, color: '#888888', icon: null };
  };

  const priority = getPriorityInfo(task.priority);
  const statusInfo = getStatusInfo(task.status);

  const handleCopyId = () => {
    navigator.clipboard.writeText(task.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-bg-notion flex flex-col items-center overflow-x-hidden selection:bg-focus-blue/10 selection:text-focus-blue">
      <div className="w-full max-w-4xl px-8 py-12 flex flex-col gap-12">
        
        {/* Breadcrumbs */}
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

        {/* Primary Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded border border-border-notion text-[9px] font-bold uppercase tracking-tighter text-text-dim w-fit opacity-50">
              ID: {task.id}
            </div>
            <button 
              onClick={handleCopyId}
              className={`p-1 rounded hover:bg-bg-secondary transition-all ${copied ? 'text-done scale-110' : 'text-text-dim opacity-30 hover:opacity-100'}`}
              title="Copy ID"
            >
              {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <h1 className="text-[42px] font-bold tracking-tight text-text-notion leading-tight">
            {task.title}
          </h1>
        </header>

        {/* ─── PROPERTIES DASHBOARD (Primary Focus) ─── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12 p-8 border border-border-notion rounded-2xl bg-white shadow-sm">
          <PropertyBlock 
            icon={<Layers size={14} />} 
            label="Status" 
            value={
              <div className="flex items-center gap-2">
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </div>
            } 
          />
          <PropertyBlock 
            icon={<AlertCircleIcon size={14} color={priority.color} />} 
            label="Priority" 
            value={priority.label} 
          />
          <PropertyBlock 
            icon={<CheckCircle2 size={14} />} 
            label="Due Date" 
            value={task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'} 
            isDimmed={!task.dueDate}
          />
          <PropertyBlock 
            icon={<Users size={14} />} 
            label="Assigned Team" 
            value={getTeamName(task.teamId) || 'Unassigned'} 
            isDimmed={!task.teamId}
          />
          <PropertyBlock 
            icon={<User size={14} />} 
            label="Assignee" 
            value={getMemberName(task.memberId) || 'Unassigned'} 
            isDimmed={!task.memberId}
          />
          <PropertyBlock 
            icon={<User size={14} />} 
            label="Creator" 
            value={getMemberName(task.createdById) || 'System'} 
          />
          <PropertyBlock 
            icon={<Calendar size={14} />} 
            label="Created" 
            value={new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
          />
          <PropertyBlock 
            icon={<Clock size={14} />} 
            label="Updated" 
            value={new Date(task.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
          />
        </section>

        {/* ─── SUPPORTING CONTENT ─── */}
        <div className="flex flex-col gap-16">
          
          {/* Description Section */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] opacity-40">
              <Type size={14} /> Description
            </div>
            <p className="text-[17px] leading-relaxed text-text-notion/90 whitespace-pre-wrap max-w-2xl">
              {task.description || "No description provided."}
            </p>
          </section>

          {/* Task Map Integration */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] opacity-40">
              Connections
            </div>
            <button 
              onClick={() => setIsMapOpen(true)}
              className="group flex items-center gap-6 p-6 border border-border-notion rounded-2xl bg-bg-secondary/30 hover:bg-bg-secondary transition-all text-left w-full max-w-2xl"
            >
              <div className="p-4 rounded-xl bg-white border border-border-notion shadow-sm text-focus-blue group-hover:scale-110 transition-transform">
                <Map size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-text-notion font-bold text-base">Open Workspace Map</span>
                <span className="text-text-dim text-[13px]">Explore dependencies and related tasks.</span>
              </div>
            </button>
          </section>
        </div>

        <TaskMapModal 
          isOpen={isMapOpen} 
          onClose={() => setIsMapOpen(false)} 
          title={task.title}
        >
          <TaskMap taskId={taskId} />
        </TaskMapModal>

        <footer className="w-full flex justify-between items-center opacity-30 mt-20">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Taskinator</div>
        </footer>
      </div>
    </div>
  );
};

const PropertyBlock: React.FC<{ icon: React.ReactNode, label: string, value: React.ReactNode, isDimmed?: boolean }> = ({ icon, label, value, isDimmed }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-text-dim opacity-50">
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-[15px] font-semibold ${isDimmed ? 'text-text-dim font-medium opacity-40' : 'text-text-notion'}`}>
      {value}
    </div>
  </div>
);

const AlertCircleIcon: React.FC<{ size: number, color: string }> = ({ size, color }) => (
  <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
    <div className="absolute inset-0 rounded-full opacity-20" style={{ backgroundColor: color }} />
    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
  </div>
);
