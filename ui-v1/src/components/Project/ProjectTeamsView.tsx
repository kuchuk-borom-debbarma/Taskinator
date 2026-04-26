import { useParams, useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import type { Team } from '../../api/types';
import { Users, Plus, Loader2, Layers } from 'lucide-react';
import { useState } from 'react';

export default function ProjectTeamsView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/teams' });
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/teams' }) as any;
  const navigate = useNavigate();
  const { teamApi } = useApi();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [pageSize] = useState(20);

  const { data: teamsResult, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['project-teams', projectId, cursor, direction],
    queryFn: () => {
      if (direction === 'backward') {
        return teamApi.getTeams(projectId, { last: pageSize, before: cursor });
      }
      return teamApi.getTeams(projectId, {
        first: pageSize,
        after: direction === 'forward' ? cursor : undefined,
      });
    },
    placeholderData: (prev) => prev,
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: () => teamApi.createTeam(projectId, newTeamName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-teams'] });
      setNewTeamName('');
      setShowCreate(false);
    },
  });

  const teams = teamsResult?.teams || [];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Teams</h1>
          <p className="text-slate-400 text-sm">Team clusters within this project.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          <Plus size={18} />
          New Team
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
          <Loader2 className="animate-spin" size={32} />
          <span className="text-sm font-medium">Loading teams...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} projectId={projectId} />
            ))}

            {teams.length === 0 && (
              <div className="col-span-full py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center text-slate-500 italic">
                <Layers size={48} className="opacity-10 mb-4" />
                <p>No teams in this project.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {(teamsResult?.hasNextPage || teamsResult?.hasPreviousPage) && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                disabled={!teamsResult?.hasPreviousPage || isPlaceholderData}
                onClick={() => navigate({ search: (prev: any) => ({ ...prev, cursor: teamsResult?.startCursor || undefined, direction: 'backward' as const }) })}
                className="px-6 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
              >
                ← Previous
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                disabled={!teamsResult?.hasNextPage || isPlaceholderData}
                onClick={() => navigate({ search: (prev: any) => ({ ...prev, cursor: teamsResult?.endCursor || undefined, direction: 'forward' as const }) })}
                className="px-6 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-white font-bold text-[15px] tracking-tight mb-6">Create Team</h3>
            <form onSubmit={(e) => { e.preventDefault(); if (newTeamName.trim()) createMutation.mutate(); }} className="flex flex-col gap-4">
              <input
                autoFocus
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Team name..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-[14px] text-white font-medium focus:outline-none focus:border-focus-blue/40 placeholder:text-white/10 transition-all"
                required
              />
              {createMutation.isError && (
                <p className="text-red-400 text-[11px] font-bold">{(createMutation.error as Error).message}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 border border-white/10 rounded-xl text-white/40 hover:text-white font-bold text-[13px] transition-all hover:bg-white/5">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newTeamName.trim()}
                  className="flex-1 py-3 bg-focus-blue text-white rounded-xl font-bold text-[13px] hover:bg-focus-blue/90 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, projectId }: { team: Team, projectId: string }) {
  return (
    <div className="glass-panel p-6 border border-white/5 bg-white/[0.02] rounded-[32px] hover:border-white/10 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Users size={64} />
      </div>
      
      <Link 
        to="/projects/$projectId/teams/$teamId" 
        params={{ projectId: projectId, teamId: team.id }}
        className="flex flex-col gap-6 h-full relative z-10 group/card"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-white group-hover/card:text-blue-400 transition-colors uppercase tracking-tight">
              {team.name}
            </h3>
            {team.createdBy && (
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                by {team.createdBy.username}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-auto">
          {team.createdAt && (
            <div className="text-[10px] text-slate-600 font-medium">
              Created {new Date(team.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          <div className="text-[10px] font-black text-slate-700 uppercase">v{team.version}</div>
        </div>
      </Link>
    </div>
  );
}
