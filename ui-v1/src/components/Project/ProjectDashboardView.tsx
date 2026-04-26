import { useParams, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { 
  Users, 
  Kanban, 
  Layers, 
  ArrowRight,
} from 'lucide-react';

export default function ProjectDashboardView() {
  const { projectId } = useParams({ strict: false }) as any;
  const { projectApi } = useApi();

  const { data: dashboardData, isLoading: isProjectLoading, isError, error } = useQuery({
    queryKey: ['project-dashboard-members', projectId],
    queryFn: () => projectApi.getProjectDashboardData(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 3,
  });

  const project = dashboardData?.project;

  if (isError) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="rounded-[32px] border border-red-200 bg-red-50 px-6 py-8 text-center">
          <h1 className="text-lg font-black text-red-700 mb-2">Dashboard failed to load</h1>
          <p className="text-sm text-red-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (isProjectLoading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  const teams = dashboardData?.teams || [];
  const tasks = dashboardData?.tasks || [];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Project Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-text-notion mb-2">{project.name}</h1>
        {project.description && (
          <p className="text-text-dim text-sm max-w-2xl leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <QuickStat label="Teams" value={project.teamsCount} icon={Layers} color="blue" />
        <QuickStat label="Tasks" value={project.tasksCount} icon={Kanban} color="purple" />
        <QuickStat label="Members" value={project.projectMembersCount} icon={Users} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Teams */}
        <div className="flex flex-col gap-6">
          <SectionHeader icon={Layers} title="Teams" />
          <div className="flex flex-col gap-3 min-h-[200px]">
            {teams.map(t => (
              <Link 
                key={t.id} 
                to="/projects/$projectId/teams"
                params={{ projectId }}
                className="flex items-center justify-between p-4 bg-white/78 border border-border-notion rounded-2xl hover:bg-white hover:border-focus-blue/20 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-focus-blue flex items-center justify-center">
                     <Layers size={14} />
                  </div>
                  <span className="text-sm font-bold text-text-notion uppercase tracking-tight">{t.name}</span>
                </div>
                <ArrowRight size={14} className="text-text-dim group-hover:text-focus-blue transition-all" />
              </Link>
            ))}
            {teams.length === 0 && <div className="p-10 text-center text-xs text-text-dim italic">No teams in this project.</div>}
            {teams.length > 0 && (
              <Link to="/projects/$projectId/teams" params={{ projectId }} className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-focus-blue mt-2 text-center">
                View All Teams →
              </Link>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="flex flex-col gap-6">
          <SectionHeader icon={Kanban} title="Recent Tasks" />
          <div className="flex flex-col gap-3 min-h-[200px]">
            {tasks.slice(0, 5).map(tk => (
              <Link 
                key={tk.id} 
                to="/projects/$projectId/tasks/$taskId"
                params={{ projectId, taskId: tk.id }}
                className="p-4 bg-white/78 border border-border-notion rounded-2xl hover:border-focus-blue/20 transition-all flex flex-col gap-2 group shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-text-notion group-hover:text-focus-blue transition-colors line-clamp-1">{tk.title}</span>
                  <div className="px-2 py-0.5 rounded-md bg-bg-secondary text-[9px] font-black text-text-dim uppercase border border-border-notion">{tk.status}</div>
                </div>
                {tk.description && (
                  <p className="text-[11px] text-text-dim line-clamp-1">{tk.description}</p>
                )}
              </Link>
            ))}
            {tasks.length === 0 && <div className="p-10 text-center text-xs text-text-dim italic">No tasks in this project.</div>}
            {tasks.length > 0 && (
              <Link to="/projects/$projectId/tasks" params={{ projectId }} className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-focus-blue mt-2 text-center">
                View All Tasks →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-focus-blue bg-blue-50',
    purple: 'text-violet-600 bg-violet-50',
    emerald: 'text-emerald-600 bg-emerald-50',
  };

  return (
    <div className="glass-panel p-6 border border-border-notion bg-white/82 rounded-3xl hover:border-focus-blue/20 transition-all group shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">{label}</span>
      </div>
      <div className="text-4xl font-black text-text-notion tabular-nums tracking-tighter">
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="w-8 h-8 rounded-lg bg-bg-secondary border border-border-notion flex items-center justify-center text-text-dim">
        <Icon size={16} />
      </div>
      <h2 className="text-sm font-bold text-text-notion tracking-tight">{title}</h2>
    </div>
  );
}
