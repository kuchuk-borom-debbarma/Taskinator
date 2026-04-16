import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users2, ChevronLeft, ChevronRight } from 'lucide-react';
import { gqlClient } from '../graphql/client';
import { GET_TEAMS } from '../graphql/operations';
import { cn } from '../utils/cn';

interface Team {
  id: string;
  name: string;
  creator?: { username: string };
}

interface TeamGridProps {
  projectId: string;
  selectedTeamId: string | null;
  onSelectTeam: (id: string) => void;
  onCreateTeam: () => void;
}

export const TeamGrid: React.FC<TeamGridProps> = ({
  projectId,
  selectedTeamId,
  onSelectTeam,
  onCreateTeam,
}) => {
  const PAGE_SIZE = 9;
  const [cursor, setCursor] = useState<string | null>(null);
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['teams', projectId, cursor, direction],
    queryFn: () => gqlClient.request<any>(GET_TEAMS, { 
        projectId, 
        first: direction === 'FORWARD' ? PAGE_SIZE : undefined,
        after: direction === 'FORWARD' ? (cursor || undefined) : undefined,
        last: direction === 'BACKWARD' ? PAGE_SIZE : undefined,
        before: direction === 'BACKWARD' ? (cursor || undefined) : undefined
    }),
    placeholderData: (prev) => prev,
    enabled: !!projectId,
  });

  const connection = data?.teams || { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };
  const teams: Team[] = connection.edges.map((e: any) => e.node);
  const pageInfo = connection.pageInfo;

  const handleNext = () => {
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
        setDirection('FORWARD');
        setCursor(pageInfo.endCursor);
    }
  };

  const handlePrev = () => {
    if (pageInfo.hasPreviousPage && pageInfo.startCursor) {
        setDirection('BACKWARD');
        setCursor(pageInfo.startCursor);
    }
  };

  if (isLoading && !data) {
    return (
        <div className="px-10 py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
  }

  return (
    <div className="px-10 h-full flex flex-col pb-20 relative">
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {teams.length === 0 && !isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                <Users2 size={32} className="text-muted-foreground/30 mb-4" />
                <p className="text-sm font-bold text-muted-foreground">No teams forged yet.</p>
                <button 
                    onClick={onCreateTeam}
                    className="mt-6 flex items-center gap-2 text-[12px] font-bold text-primary hover:text-indigo-400 bg-primary/10 px-4 py-2 rounded-lg transition-all"
                >
                    <Plus size={14} /> Forge First Team
                </button>
            </div>
        ) : (
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max transition-opacity duration-300",
                isPlaceholderData ? "opacity-50" : "opacity-100"
            )}>
                {teams.map((team) => (
                    <button 
                        key={team.id}
                        onClick={() => onSelectTeam(team.id)}
                        className={cn(
                            "text-left p-6 rounded-3xl border transition-all duration-300 group hover:-translate-y-1",
                            selectedTeamId === team.id 
                                ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20" 
                                : "glass border-white/5 hover:border-white/10"
                        )}
                    >
                        <h3 className="text-lg font-black text-foreground/90 mb-4 group-hover:text-primary transition-colors">{team.name}</h3>
                        <div className="flex items-center gap-3 pt-4 border-t border-white/5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            <div className="flex items-center gap-1.5 flex-1 w-0 min-w-0">
                                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-black shrink-0">
                                    {team.creator?.username?.substring(0, 1).toUpperCase() || '?'}
                                </div>
                                <span className="truncate">{team.creator?.username}</span>
                            </div>
                            <span className="shrink-0 text-white/30 hidden group-hover:block transition-all">Expand &rarr;</span>
                        </div>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Pagination Controls */}
      {(pageInfo.hasNextPage || pageInfo.hasPreviousPage) && (
        <div className="mt-8 flex items-center justify-center gap-4">
            <button 
                onClick={handlePrev}
                disabled={!pageInfo.hasPreviousPage || isPlaceholderData}
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/5 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary/30 transition-all text-[10px] font-black uppercase tracking-widest"
            >
                <ChevronLeft size={14} /> Previous
            </button>
            <div className="h-4 w-[1px] bg-white/5" />
            <button 
                onClick={handleNext}
                disabled={!pageInfo.hasNextPage || isPlaceholderData}
                className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/5 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary/30 transition-all text-[10px] font-black uppercase tracking-widest"
            >
                Next <ChevronRight size={14} />
            </button>
        </div>
      )}
    </div>
  );
};
