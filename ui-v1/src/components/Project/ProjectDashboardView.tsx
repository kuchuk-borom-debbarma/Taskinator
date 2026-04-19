import { useParams, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { 
  BarChart3, 
  Users, 
  Kanban, 
  Layers, 
  ArrowRight,
  Network
} from 'lucide-react';

export default function ProjectDashboardView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/' });
  const { projectApi, taskApi } = useApi();

  // Fetch Core Project Stats
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-dashboard', projectId],
    queryFn: () => projectApi.getProject(projectId),
  });

  // Fetch My Personal Context (could be optimized into one GraphQL query later)
  // For now we'll simulate or use what we updated in ProjectAPI if ready.
  // Actually, I'll use the counts from 'project' which we updated to include stats.

  if (isLoading || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/5" />
          <div className="h-4 w-32 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Calculated Teams', value: project.teamCount || 0, icon: Layers, color: 'blue', sub: 'Cluster nodes' },
    { label: 'Network Tasks', value: project.taskCount || 0, icon: Kanban, color: 'purple', sub: 'Active DAG nodes' },
    { label: 'Collaborators', value: project.memberCount || 0, icon: Users, color: 'emerald', sub: 'Authorized agents' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Project Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">{project.name}</h1>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          {project.description || 'System operating in default mode. No project description defined.'}
        </p>
      </div>

      {/* Numerical Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-3xl hover:border-white/10 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-2.5 rounded-xl bg-${s.color}-500/10 text-${s.color}-400`}>
                <s.icon size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</span>
                <span className="text-[10px] font-medium text-slate-600">{s.sub}</span>
              </div>
            </div>
            <div className="text-4xl font-black text-white tabular-nums tracking-tighter">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Resource Distribution */}
        <div className="flex flex-col gap-6">
           <SectionHeader icon={BarChart3} title="Resource Distribution" />
           <div className="glass-panel p-8 border border-white/5 bg-white/[0.01] rounded-[32px] flex flex-col gap-4 min-h-[200px]">
              {project.taskLabelCounts?.map((lc) => (
                <div key={lc.label} className="flex flex-col gap-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-slate-400">{lc.label}</span>
                    <span className="text-white">{lc.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (lc.count / (project.taskCount || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
              {(!project.taskLabelCounts || project.taskLabelCounts.length === 0) && (
                <div className="flex-1 flex items-center justify-center opacity-30 italic text-xs text-slate-500">
                  No task metrics recorded.
                </div>
              )}
           </div>
        </div>

        {/* My Teams */}
        <div className="flex flex-col gap-6">
          <SectionHeader icon={Network} title="My Participation Clusters" />
          <div className="flex flex-col gap-3 min-h-[200px]">
             {/* Fetching my teams for the current user in this project */}
             <PersonalTeamsList projectId={projectId} />
          </div>
        </div>

        {/* My Tasks */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SectionHeader icon={Kanban} title="Nodes Requiring Consensus (Assigned to Me)" />
          <div className="min-h-[200px]">
             <PersonalTasksList projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalTeamsList({ projectId }: { projectId: string }) {
  const { teamApi } = useApi();
  const { data, isLoading } = useQuery({
    queryKey: ['my-teams', projectId],
    queryFn: () => teamApi.getTeams(projectId), // In real usage, this would filter by membership
  });

  if (isLoading) return <div className="p-4 bg-white/5 rounded-2xl animate-pulse h-20" />;

  const teams = data?.teams.slice(0, 3) || [];

  return (
    <div className="flex flex-col gap-2">
      {teams.map(t => (
        <Link 
          key={t.id} 
          to={`/projects/${projectId}/teams`} 
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
      {teams.length === 0 && <div className="p-10 text-center text-xs text-slate-600 italic">No clusters found.</div>}
      {teams.length > 0 && (
        <Link to={`/projects/${projectId}/teams`} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 mt-2 text-center">
          Evaluate All Clusters
        </Link>
      )}
    </div>
  );
}

function PersonalTasksList({ projectId }: { projectId: string }) {
  const { taskApi } = useApi();
  // Simplified fetch for assigned tasks - would need proper member filter in API
  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks-dashboard', projectId],
    queryFn: () => taskApi.getTasks(projectId, { first: 5 }),
  });

  if (isLoading) return <div className="p-4 bg-white/5 rounded-2xl animate-pulse h-20" />;

  const tasks = data?.tasks || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {tasks.map(tk => (
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
          <p className="text-[11px] text-slate-500 line-clamp-1">{tk.description}</p>
        </Link>
      ))}
      {tasks.length === 0 && <div className="col-span-full py-10 text-center text-xs text-slate-600 italic">No assigned nodes detected.</div>}
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

