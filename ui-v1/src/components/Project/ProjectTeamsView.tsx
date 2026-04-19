import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Users, Plus, ArrowRight, Loader2, Layers } from 'lucide-react';

export default function ProjectTeamsView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/teams' });
  const { teamApi } = useApi();

  // For now we'll just fetch first 20 teams. 
  // In a real app we'd use useInfiniteQuery.
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['project-teams', projectId],
    queryFn: () => teamApi.getTeams(projectId), 
  });

  const teams = teamsData?.teams || [];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Calculated Teams</h1>
          <p className="text-slate-400 text-sm">Cluster groups governing subsets of the task graph.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
          <Plus size={18} />
          Form New Team
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <Loader2 className="animate-spin" size={32} />
          <span className="text-sm font-medium">Resolving clusters...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
          {teams.length === 0 && (
            <div className="col-span-full py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center text-slate-500 italic">
              <Layers size={48} className="opacity-10 mb-4" />
              <p>No teams detected in this project's hierarchy.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: any }) {
  return (
    <div className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-[32px] hover:border-white/10 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Users size={64} />
      </div>
      
      <div className="flex flex-col gap-6 h-full relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
              {team.name}
            </h3>
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
              ID: {team.id.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-auto">
           <div className="flex flex-col">
             <span className="text-xl font-black text-white">{team.memberCount || 0}</span>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Members</span>
           </div>
           <div className="flex flex-col">
             <span className="text-xl font-black text-white">{team.taskCount || 0}</span>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Tasks</span>
           </div>
        </div>

        <button className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/5 text-white/40 group-hover:bg-blue-500 group-hover:text-white transition-all font-bold text-xs">
          View Detail
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
