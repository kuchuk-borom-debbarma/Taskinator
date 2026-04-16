import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2, Users, UserPlus } from 'lucide-react';
import { UserSearchDropdown } from './UserSearchDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { gqlClient } from '../graphql/client';
import { GET_PROJECT_MEMBERS, GET_TEAM_MEMBERS } from '../graphql/operations';
import { useSlidingWindow } from '../hooks/useSlidingWindow';

interface Member {
  id: string;
  userId: string;
  user?: { id: string; username: string; email: string };
}

interface MemberManagerProps {
  projectId: string;
  teamId?: string; // If provided, manage team members. Otherwise, project members.
  onAdd: (userId: string) => void;
  onRemove: (memberId: string) => void;
  title?: string;
  placeholder?: string;
}

export const MemberManager: React.FC<MemberManagerProps> = ({
  projectId,
  teamId,
  onAdd,
  onRemove,
  title = 'Members',
  placeholder = 'Add people to this workspace...',
}) => {
  const isTeam = !!teamId;
  const queryKey = isTeam 
    ? ['team-members', projectId, teamId] 
    : ['project-members', projectId];

  // Initial fetch
  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, 'initial'],
    queryFn: () => gqlClient.request<any>(
      isTeam ? GET_TEAM_MEMBERS : GET_PROJECT_MEMBERS, 
      { projectId, teamId, first: 10 }
    ),
    enabled: !!projectId && (!isTeam || !!teamId),
  });

  const connection = useMemo(() => {
    const res = isTeam ? data?.teamMembers : data?.projectMembers;
    return res || { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };
  }, [data, isTeam]);

  const fetchMore = async (params: any) => {
    const res = await gqlClient.request<any>(
      isTeam ? GET_TEAM_MEMBERS : GET_PROJECT_MEMBERS, 
      { projectId, teamId, ...params }
    );
    return isTeam ? res.teamMembers : res.projectMembers;
  };

  const {
    items: members,
    containerRef,
    topSentinelRef,
    bottomSentinelRef,
    isLoadingNext,
    isLoadingPrev
  } = useSlidingWindow<Member>({
    initialData: connection,
    fetchMore,
    pageSize: 10,
    maxWindowSize: 30
  });

  const handleSelect = (user: any) => {
    const alreadyMember = members.some((m: Member) => m.userId === user.id);
    if (!alreadyMember) onAdd(user.id);
  };

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Users size={14} />
          </div>
          <h4 className="text-[13px] font-bold tracking-tight text-foreground/90 uppercase tracking-widest">{title}</h4>
        </div>
        <div className="flex -space-x-2">
           {members.slice(0, 3).map((m: Member, i: number) => (
             <div key={m.id} className="w-6 h-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[8px] font-bold" style={{ zIndex: 10 - i }}>
                {(m.user?.username || 'U').substring(0, 1).toUpperCase()}
             </div>
           ))}
           {connection.pageInfo.hasNextPage && (
             <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[7px] font-bold text-muted-foreground z-0">
               +
             </div>
           )}
        </div>
      </div>

      <div className="relative group/search shrink-0">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors">
          <UserPlus size={14} />
        </div>
        <UserSearchDropdown
          onSelect={handleSelect}
          placeholder={placeholder}
          projectContext={{ projectId }}
          teamContext={teamId ? { projectId, teamId } : undefined}
          className="pl-9 bg-white/[0.03] border-white/5 focus:bg-white/[0.05] focus:border-primary/20 rounded-xl py-2.5 text-xs transition-all"
        />
      </div>

      <div 
        ref={containerRef}
        className="flex-1 space-y-2 overflow-y-auto px-1 pr-2 custom-scrollbar relative"
      >
        {/* Top Sentinel */}
        <div ref={topSentinelRef} className="h-4 flex items-center justify-center">
            {isLoadingPrev && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
        </div>

        <AnimatePresence mode="popLayout">
          {members.map((member: Member) => (
            <motion.div
              key={member.id}
              layout
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-transparent hover:border-white/5 group transition-all duration-200"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-secondary/50 to-secondary border border-white/10 flex items-center justify-center text-[12px] font-bold shadow-lg">
                  {(member.user?.username || member.userId).substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-foreground/90 truncate">
                    {member.user?.username || member.userId}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 truncate">
                    {member.user?.email || `ID: ${member.id.substring(0, 8)}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemove(member.id)}
                className="p-2 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bottom Sentinel */}
        <div ref={bottomSentinelRef} className="h-10 flex items-center justify-center">
            {isLoadingNext && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
        </div>

        {members.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
             <div className="p-3 bg-white/5 rounded-full mb-3">
               <Users size={20} className="text-muted-foreground/30" />
             </div>
            <p className="text-[11px] font-medium text-muted-foreground/40">No participants yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
