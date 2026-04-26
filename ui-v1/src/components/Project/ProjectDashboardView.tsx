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
  const { projectApi, teamApi, taskApi } = useApi();

  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project-dashboard', projectId],
    queryFn: () => projectApi.getProject(projectId),
  });

  // Fetch teams for this project
  const { data: teamsData } = useQuery({
    queryKey: ['project-dashboard-teams', projectId],
    queryFn: () => teamApi.getTeams(projectId, 5),
    enabled: !!projectId,
  });

  // Fetch assigned tasks for this project (my tasks)
  const { data: tasksData } = useQuery({
    queryKey: ['project-dashboard-tasks', projectId],
    queryFn: () => taskApi.getTasks(projectId, { first: 10 }),
    enabled: !!projectId,
  });

  // Fetch members for this project
  const { data: membersData } = useQuery({
    queryKey: ['project-dashboard-members', projectId],
    queryFn: () => projectApi.getProjectMembers(projectId, 5),
    enabled: !!projectId,
  });

  if (isProjectLoading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/5" />
          <div className="h-4 w-32 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  const teams = teamsData?.teams || [];
  const tasks = tasksData?.tasks || [];
  const memberCount = membersData?.members.length || 0;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Project Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">{project.name}</h1>
        {project.description && (
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
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
                className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                     <Layers size={14} />
                  </div>
                  <span className="text-sm font-bold text-white uppercase tracking-tight">{t.name}</span>
                </div>
                <ArrowRight size={14} className="text-slate-600 group-hover:text-white transition-all" />
              </Link>
            ))}
            {teams.length === 0 && <div className="p-10 text-center text-xs text-slate-600 italic">No teams in this project.</div>}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="flex flex-col gap-6">
          <SectionHeader icon={Kanban} title="Recent Tasks" />
          <div className="flex flex-col gap-3 min-h-[200px]">
            {tasks.slice(0, 5).map(tk => (
              <Link 
                key={tk.id} 
                to={`/projects/$projectId/tasks/$taskId`}
                params={{ projectId, taskId: tk.id }}
                className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all flex flex-col gap-2 group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">{tk.title}</span>
                  <div className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black text-slate-500 uppercase">{tk.status}</div>
                </div>
                {tk.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-1">{tk.description}</p>
                )}
              </Link>
            ))}
            {tasks.length === 0 && <div className="p-10 text-center text-xs text-slate-600 italic">No tasks in this project.</div>}
            {tasks.length > 0 && (
              <Link to="/projects/$projectId/tasks" params={{ projectId }} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 mt-2 text-center">
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
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
  };

  return (
    <div className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-3xl hover:border-white/10 transition-all group">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-2.5 rounded-xl ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <div className="text-4xl font-black text-white tabular-nums tracking-tighter">
        {value}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
        <Icon size={16} />
      </div>
      <h2 className="text-sm font-bold text-slate-200 tracking-tight">{title}</h2>
    </div>
  );
}
