import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, User, Mail, Plus } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { gqlClient } from '../graphql/client';
import { SEARCH_USERS, SEARCH_TEAM_USERS } from '../graphql/operations';
import { useSlidingWindow } from '../hooks/useSlidingWindow';

interface UserSearchResult {
  id: string;
  username: string;
  email: string;
}

interface UserSearchDropdownProps {
  onSelect: (user: UserSearchResult) => void;
  placeholder?: string;
  projectContext?: { projectId: string };
  teamContext?: { projectId: string; teamId: string };
  className?: string;
}

export const UserSearchDropdown: React.FC<UserSearchDropdownProps> = ({
  onSelect,
  placeholder = 'Search users...',
  projectContext,
  teamContext,
  className
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const queryKey = teamContext 
    ? ['searchTeamUsers', teamContext.teamId, query]
    : ['searchUsers', query];

  // Initial search fetch
  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, 'initial'],
    queryFn: () => gqlClient.request<any>(
      teamContext ? SEARCH_TEAM_USERS : SEARCH_USERS,
      { 
        projectId: teamContext?.projectId || projectContext?.projectId, 
        teamId: teamContext?.teamId,
        query, 
        first: 10 
      }
    ),
    enabled: query.length >= 2 && isOpen,
  });

  const connection = useMemo(() => {
    const res = teamContext ? data?.searchTeamUsers : data?.searchUsers;
    return res || { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };
  }, [data, teamContext]);

  const fetchMore = async (params: any) => {
    const res = await gqlClient.request<any>(
      teamContext ? SEARCH_TEAM_USERS : SEARCH_USERS,
      { 
        projectId: teamContext?.projectId || projectContext?.projectId, 
        teamId: teamContext?.teamId,
        query, 
        ...params 
      }
    );
    return teamContext ? res.searchTeamUsers : res.searchUsers;
  };

  const {
    items: results,
    containerRef: scrollRef,
    topSentinelRef,
    bottomSentinelRef,
    isLoadingNext,
    isLoadingPrev
  } = useSlidingWindow<UserSearchResult>({
    initialData: connection,
    fetchMore,
    pageSize: 10,
    maxWindowSize: 30
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (user: UserSearchResult) => {
    onSelect(user);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className={cn(
          "w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-all",
          className
        )}
      />

      <AnimatePresence>
        {isOpen && (query.length >= 2 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute z-[100] top-full left-0 right-0 mt-2 glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[300px] flex flex-col"
          >
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-1.5"
            >
              {/* Top Sentinel */}
              <div ref={topSentinelRef} className="h-2 flex items-center justify-center">
                  {isLoadingPrev && <Loader2 size={12} className="animate-spin text-primary/30" />}
              </div>

              {isLoading && !results.length ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              ) : results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {results.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelect(user)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.05] transition-all group text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-semibold truncate">{user.username}</span>
                          <div className="flex items-center gap-1.5 opacity-40">
                             <Mail size={10} />
                             <span className="text-[10px] truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <Plus size={14} className="text-muted-foreground group-hover:text-primary transition-colors pr-1" />
                    </button>
                  ))}
                </div>
              ) : !isLoading && (
                <div className="py-10 text-center text-muted-foreground/40 space-y-2">
                   <Search size={24} className="mx-auto opacity-20" />
                   <p className="text-[11px] font-medium">No matches found for "{query}"</p>
                </div>
              )}

              {/* Bottom Sentinel */}
              <div ref={bottomSentinelRef} className="h-6 flex items-center justify-center">
                  {isLoadingNext && <Loader2 size={12} className="animate-spin text-primary/30" />}
              </div>
            </div>
            {results.length > 0 && (
              <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.05]">
                <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/30">
                    Results: {results.length} • Scroll to reveal more
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
