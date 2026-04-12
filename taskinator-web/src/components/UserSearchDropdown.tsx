import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, User, Mail, Plus } from 'lucide-react';
import { userApi, type UserSearchResult } from '../api/client';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

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

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['user-search', query, projectContext, teamContext],
    queryFn: async () => {
       if (teamContext) {
           const res = await userApi.searchTeamUsers({ ...teamContext, search: query });
           return res.users;
       }
       if (projectContext) {
           const res = await userApi.searchUsers({ search: query });
           // In old API this was searchUsers but ideally searchProjectUsers. For now fallback to userApi.searchUsers.
           return res.users;
       }
       const res = await userApi.searchUsers({ search: query });
       return res.users;
    },
    enabled: query.length >= 2 && isOpen,
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
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              ) : (results as UserSearchResult[]).length > 0 ? (
                <div className="p-1.5 flex flex-col gap-1">
                  {(results as UserSearchResult[]).slice(0, 8).map((user: UserSearchResult) => (
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
              ) : (
                <div className="py-10 text-center text-muted-foreground/40 space-y-2">
                   <Search size={24} className="mx-auto opacity-20" />
                   <p className="text-[11px] font-medium">No matches found for "{query}"</p>
                </div>
              )}
            </div>
            {(results as UserSearchResult[]).length > 0 && (
              <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.05]">
                <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/30">Select a user to add</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
