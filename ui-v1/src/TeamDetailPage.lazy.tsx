import { useParams, useSearch, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './hooks/useApi';
import { 
  Users, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Hash, 
  User as UserIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export default function TeamDetailPage() {
  const { projectId, teamId } = useParams({ strict: false }) as any;
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/teams/$teamId' }) as any;
  const navigate = useNavigate();
  const { teamApi } = useApi();
  const [pageSize] = useState(10);

  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamApi.getTeam(teamId),
    enabled: !!teamId,
  });

  const { data: membersResult, isLoading: isMembersLoading, isPlaceholderData } = useQuery({
    queryKey: ['team-members', teamId, cursor, direction],
    queryFn: () => teamApi.getTeamMembers(projectId, teamId, {
      first: direction === 'backward' ? undefined : pageSize,
      after: direction === 'forward' ? cursor : undefined,
      last: direction === 'backward' ? pageSize : undefined,
      before: direction === 'backward' ? cursor : undefined,
    }),
    placeholderData: (prev) => prev,
    enabled: !!teamId && !!projectId,
  });

  if (isTeamLoading || !team) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0F1A] gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 opacity-20" />
          <Users className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
        </div>
        <span className="text-[12px] font-black text-white uppercase tracking-[0.5em] animate-pulse">Synchronizing Squad</span>
      </div>
    );
  }

  const members = membersResult?.members || [];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#0B0F1A] p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Navigation */}
      <div className="mb-12 flex items-center justify-between">
        <Link 
          to="/projects/$projectId/teams" 
          params={{ projectId }}
          className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white hover:border-white/20 transition-all backdrop-blur-xl"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-widest">Return to Squads</span>
        </Link>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Hash size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">v{team.version}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Team Identity & Stats */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-4 leading-none">
              {team.name}
            </h1>
            <p className="text-slate-500 text-[14px] font-medium leading-relaxed">
              Assigned to <span className="text-slate-300 font-bold">{team.project?.name}</span> infrastructure.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <StatRow icon={UserIcon} label="Architect" value={team.createdBy?.username || 'System'} />
            <StatRow icon={Calendar} label="Deployment" value={new Date(team.createdAt!).toLocaleDateString()} />
          </div>

          {/* Quick Metrics */}
          <div className="p-8 rounded-[32px] bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={120} />
            </div>
            <div className="relative z-10">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 block">Active Personnel</span>
              <div className="text-6xl font-black text-white tracking-tighter tabular-nums mb-1">
                {members.length}
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Members Synced</span>
            </div>
          </div>
        </div>

        {/* Right Column: Member Matrix */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Member Matrix</h2>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Personnel assigned to this squad</p>
              </div>
            </div>

            {/* Matrix Pagination */}
            <div className="flex items-center gap-2">
              <PaginationButton 
                direction="prev" 
                disabled={!membersResult?.hasPreviousPage || isPlaceholderData} 
                onClick={() => navigate({ search: (prev: any) => ({ ...prev, cursor: membersResult?.startCursor, direction: 'backward' }) })}
              />
              <PaginationButton 
                direction="next" 
                disabled={!membersResult?.hasNextPage || isPlaceholderData} 
                onClick={() => navigate({ search: (prev: any) => ({ ...prev, cursor: membersResult?.endCursor, direction: 'forward' }) })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 min-h-[400px]">
            {isMembersLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-600 italic text-xs">
                Recalibrating Personnel...
              </div>
            ) : (
              members.map((member) => (
                <div key={member.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <UserIcon size={16} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white tracking-tight">{member.user?.username}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Member Since {new Date(member.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Active
                  </div>
                </div>
              ))
            )}
            {!isMembersLoading && members.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-[32px] text-slate-600 gap-4">
                 <Users size={40} className="opacity-10" />
                 <p className="italic text-xs">No personnel assigned to this nexus.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">{label}</p>
        <p className="text-[14px] font-black text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function PaginationButton({ direction, disabled, onClick }: { direction: 'prev' | 'next', disabled: boolean, onClick: () => void }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95"
    >
      <Icon size={16} />
    </button>
  );
}
