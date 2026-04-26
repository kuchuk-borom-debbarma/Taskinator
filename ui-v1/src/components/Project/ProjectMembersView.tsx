import { useParams } from '@tanstack/react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import type { ProjectMember } from '../../api/types';
import { Users, Loader2, ShieldCheck } from 'lucide-react';

export default function ProjectMembersView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/members' });
  const { projectApi } = useApi();

  const {
    data: membersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['project-members', projectId],
    queryFn: ({ pageParam }) => projectApi.getProjectMembers(projectId, 15, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  const members = membersData?.pages.flatMap(p => p.members) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-notion mb-2">Project Members</h1>
          <p className="text-text-dim text-sm">Members with access to this project.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-dim gap-4">
          <Loader2 className="animate-spin" size={32} />
          <span className="text-sm font-medium">Loading members...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}

          {hasNextPage && (
            <button 
              onClick={() => fetchNextPage()} 
              disabled={isFetchingNextPage}
              className="col-span-full py-4 text-[11px] font-black uppercase tracking-widest text-focus-blue hover:text-text-notion transition-all bg-white/70 rounded-2xl border border-dashed border-border-notion hover:bg-white active:scale-[0.99]"
            >
              {isFetchingNextPage ? 'Loading more...' : 'Load More Members'}
            </button>
          )}

          {members.length === 0 && (
            <div className="col-span-full py-20 bg-white/60 border border-dashed border-border-notion rounded-[32px] flex flex-col items-center justify-center text-text-dim italic">
              <Users size={48} className="opacity-30 mb-4" />
              <p>No members found in this project.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: ProjectMember }) {
  const user = member.user;
  const username = user?.username || 'Unknown';
  const initial = username.slice(0, 1).toUpperCase();
  
  return (
    <div className="glass-panel p-6 border border-border-notion bg-white/82 rounded-[32px] hover:border-focus-blue/20 transition-all group shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/70 flex items-center justify-center text-focus-blue font-black text-lg group-hover:scale-110 transition-transform">
          {initial}
        </div>
        <div className="flex flex-col">
          <h3 className="text-base font-black text-text-notion group-hover:text-focus-blue transition-colors">
            {username}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-dim uppercase tracking-tighter">
            <ShieldCheck size={12} className="text-emerald-500" />
            Active Member
          </div>
        </div>
      </div>

      <div className="text-[10px] text-text-dim font-medium">
        Joined {new Date(member.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
}
