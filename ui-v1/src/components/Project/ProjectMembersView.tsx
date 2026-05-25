import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Loader2, Plus, Search, Trash2, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { ProjectMember } from '../../api/types';
import { EmptyState, TextField, formatDate, SurfaceCard } from '../shared/workspace';
import { PagingButton } from '../shared/PagingButton';
import { CONFIG } from '../../config';
import { useDebounce } from '../../hooks/useDebounce';

export default function ProjectMembersView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/members' });
  const { projectApi } = useApi();
  const queryClient = useQueryClient();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<'forward' | 'backward' | undefined>(undefined);
  const [userIds, setUserIds] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['project-members', projectId, debouncedSearch, cursor, direction],
    queryFn: () => projectApi.getProjectMembers(
      projectId,
      direction === 'backward'
        ? { last: CONFIG.PAGINATION.MEMBERS_LIST, before: cursor, search: debouncedSearch.trim() || undefined }
        : { first: CONFIG.PAGINATION.MEMBERS_LIST, after: cursor, search: debouncedSearch.trim() || undefined }
    ),
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
    placeholderData: (prev) => prev,
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCursor(undefined);
    setDirection(undefined);
  };

  const members = data?.members ?? [];
  const pageInfo = data?.pageInfo;
  const parsedUserIds = () =>
    userIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

  const addMembers = useMutation({
    mutationFn: () => projectApi.addProjectMembers(projectId, parsedUserIds()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-members-all', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setUserIds('');
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => projectApi.removeProjectMembers(projectId, [memberId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-members-all', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const handleNext = () => {
    if (pageInfo?.hasNextPage) {
      setCursor(pageInfo.endCursor ?? undefined);
      setDirection('forward');
    }
  };

  const handlePrev = () => {
    if (pageInfo?.hasPreviousPage) {
      setCursor(pageInfo.startCursor ?? undefined);
      setDirection('backward');
    }
  };

  return (
    <div className="page-frame animate-fade-in space-y-6">
      {/* Search and Add Header Panels */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Search */}
        <SurfaceCard className="p-5 flex flex-col justify-center">
          <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-xs font-bold text-app-ink uppercase tracking-wide opacity-90">
              <Search size={13} className="text-app-accent" />
              Filter Members
            </span>
            <div className="relative">
              <input
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search members by username or email..."
                className="w-full rounded-xl border border-slate-200 bg-white/70 pl-3.5 pr-8 py-2.5 text-xs text-app-ink outline-none transition focus:border-app-accent focus:bg-white focus:ring-4 focus:ring-app-accent/5 shadow-sm"
              />
              {search && (
                <button 
                  onClick={() => handleSearchChange('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-app-muted hover:text-app-ink cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </label>
        </SurfaceCard>

        {/* Add Members form */}
        <form
          className="rounded-[24px] border border-slate-200/60 bg-white/60 p-5 flex flex-col sm:flex-row items-end gap-3.5 backdrop-blur-md shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            if (parsedUserIds().length) addMembers.mutate();
          }}
        >
          <div className="flex-1 w-full">
            <TextField label="Add project member user IDs" value={userIds} onChange={setUserIds} placeholder="UUIDs separated by comma or space" />
          </div>
          <button
            type="submit"
            disabled={addMembers.isPending || parsedUserIds().length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
          >
            {addMembers.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add Members
          </button>
        </form>
      </div>

      {/* Members Feed Grid */}
      <div>
        {isLoading ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-app-accent" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description="Manage contributors, developers, and team permissions for this active project."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                removing={removeMember.isPending}
                onRemove={() => {
                  if (confirm('Remove this member from the project?')) removeMember.mutate(member.id);
                }}
              />
            ))}
          </div>
        )}

        {/* Roster Pagination */}
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200/40 pt-5 shrink-0">
          <PagingButton disabled={!pageInfo?.hasPreviousPage} onClick={handlePrev}>
            <ArrowLeft size={12} />
            Prev
          </PagingButton>
          <PagingButton disabled={!pageInfo?.hasNextPage} onClick={handleNext}>
            Next
            <ArrowRight size={12} />
          </PagingButton>
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member, removing, onRemove }: { member: ProjectMember; removing: boolean; onRemove: () => void }) {
  const username = member.user?.username || 'Unknown member';
  const initial = username.slice(0, 2).toUpperCase();

  return (
    <div className="surface-card rounded-2xl p-5 hover:translate-y-[-1px] shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft border border-app-accent/10 text-xs font-extrabold text-app-accent shadow-sm">
            {initial}
          </div>
          <div>
            <h3 className="text-sm font-bold text-app-ink leading-snug">@{username}</h3>
            <p className="text-[10px] text-app-muted mt-0.5">Joined {formatDate(member.createdAt)}</p>
          </div>
        </div>
        <button
          onClick={onRemove}
          disabled={removing}
          className="rounded-lg p-2 text-app-muted hover:bg-red-50 hover:text-red-600 transition duration-300 disabled:opacity-50 cursor-pointer shrink-0"
          title="Remove project member"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
