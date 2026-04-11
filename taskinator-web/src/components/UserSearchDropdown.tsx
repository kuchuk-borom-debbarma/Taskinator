import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User as UserIcon, Loader2, ChevronDown } from 'lucide-react';
import { userApi, projectApi, type UserSearchResult } from '../api/client';
import { cn } from '../utils/cn';

interface UserSearchDropdownProps {
    onSelect: (user: UserSearchResult) => void;
    placeholder?: string;
    className?: string;
    /**
     * When provided, the dropdown searches only within that team
     * instead of the global user list.
     */
    teamContext?: { projectId: string; teamId: string };
    projectContext?: { projectId: string };
}

const DEBOUNCE_MS = 300;

export const UserSearchDropdown: React.FC<UserSearchDropdownProps> = ({
    onSelect,
    placeholder = 'Search by exact username or paste user ID...',
    className,
    teamContext,
    projectContext,
}) => {
    const [query, setQuery]           = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [isOpen, setIsOpen]         = useState(false);
    const [cursor, setCursor]         = useState<string | undefined>(undefined);
    const [allUsers, setAllUsers]     = useState<UserSearchResult[]>([]);
    const inputRef   = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedQ(query);
            setCursor(undefined);
            setAllUsers([]);
        }, DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [query]);

    // Switch between team-scoped, project-scoped and global query
    const queryKey = teamContext
        ? ['team-user-search', teamContext.teamId, debouncedQ, cursor]
        : projectContext
            ? ['project-user-search', projectContext.projectId, debouncedQ, cursor]
            : ['user-search', debouncedQ, cursor];

    const queryFn = teamContext
        ? () => userApi.searchTeamUsers({ ...teamContext, search: debouncedQ, cursor, limit: 15 })
        : projectContext
            ? () => projectApi.searchProjectMembers({ ...projectContext, search: debouncedQ, cursor, limit: 15 })
            : () => userApi.searchUsers({ search: debouncedQ, cursor, limit: 15 });

    const { data, isFetching } = useQuery({
        queryKey,
        queryFn,
        enabled: isOpen,
        staleTime: 30_000,
    });

    // Accumulate pages
    useEffect(() => {
        if (!data) return;
        if (!cursor) {
            setAllUsers(data.users);
        } else {
            setAllUsers(prev => {
                const ids = new Set(prev.map(u => u.id));
                return [...prev, ...data.users.filter(u => !ids.has(u.id))];
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const loadMore = useCallback(() => {
        if (data?.nextCursor) setCursor(data.nextCursor);
    }, [data]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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
        setAllUsers([]);
    };

    return (
        <div ref={wrapperRef} className={cn('relative', className)}>
            <div className="relative group">
                <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none"
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-[#0d0d0d] border border-border/50 rounded-lg pl-9 pr-10 py-2 text-[13px] outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                />
                {isFetching && (
                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
                )}
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d0d0d] border border-border/60 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 flex flex-col animate-in fade-in slide-in-from-top-1 duration-100">
                    {teamContext && (
                        <div className="px-3 py-1.5 border-b border-border/20 flex items-center gap-1.5">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-primary/60">Team members only</span>
                        </div>
                    )}
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        {allUsers.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/50 gap-1">
                                {isFetching ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-primary/40" />
                                        <p className="text-[11px]">Searching...</p>
                                    </>
                                ) : (
                                    <>
                                        <UserIcon size={18} />
                                        <p className="text-[11px]">
                                            {debouncedQ 
                                                ? 'No matches matching search' 
                                                : (teamContext 
                                                    ? 'No members found in this team' 
                                                    : projectContext 
                                                        ? 'No members found in this project' 
                                                        : 'Start typing to search')}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        {allUsers.map(user => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => handleSelect(user)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left border-b border-border/10 last:border-0"
                            >
                                <div className="w-7 h-7 shrink-0 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {user.username.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[12px] font-semibold truncate">{user.username}</span>
                                    <span className="text-[10px] text-muted-foreground truncate font-mono opacity-60">{user.id}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {data?.nextCursor && (
                        <button
                            type="button"
                            onClick={loadMore}
                            disabled={isFetching}
                            className="flex items-center justify-center gap-1.5 py-2 border-t border-border/30 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all disabled:opacity-50"
                        >
                            <ChevronDown size={13} />
                            Load more
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
