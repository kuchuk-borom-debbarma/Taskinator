import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Loader2, PencilLine, Plus, Save, Search, Trash2, Users, Clock, CalendarDays } from 'lucide-react';
import { useApi } from './hooks/useApi';
import type { TeamMember } from './api/types';
import { AppModal, EmptyState, SurfaceCard, SurfaceCardStrong, TextField, formatDate, LoadingPane } from './components/shared/workspace';
import { PagingButton } from './components/shared/PagingButton';
import { CONFIG } from './config';
import { useDebounce } from './hooks/useDebounce';

type TeamSearch = {
  cursor?: string;
  direction?: 'forward' | 'backward';
};

export default function TeamDetailPage() {
  const { projectId, teamId } = useParams({ strict: false }) as { projectId: string; teamId: string };
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/teams/$teamId' }) as TeamSearch;
  const { teamApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberIds, setMemberIds] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['team-detail', teamId],
    queryFn: () => teamApi.getTeamDetail(teamId),
    enabled: !!teamId,
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  const team = detail?.team;

  const { data: membersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ['team-members', teamId, debouncedSearch, cursor, direction],
    queryFn: () =>
      teamApi.getTeamMembers(projectId, teamId, {
        first: direction === 'backward' ? undefined : CONFIG.PAGINATION.MEMBERS_LIST,
        after: direction === 'forward' ? cursor : undefined,
        last: direction === 'backward' ? CONFIG.PAGINATION.MEMBERS_LIST : undefined,
        before: direction === 'backward' ? cursor : undefined,
        search: debouncedSearch.trim() || undefined,
      }),
    enabled: !!projectId && !!teamId,
    placeholderData: (prev) => prev,
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    navigate({
      to: '/projects/$projectId/teams/$teamId',
      params: { projectId, teamId },
      search: { cursor: undefined, direction: undefined }
    });
  };

  const membersPage = membersData;
  const members = membersPage?.members ?? [];
  const isLoading = isDetailLoading || isMembersLoading;

  const parsedMemberIds = () =>
    memberIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

  const updateTeam = useMutation({
    mutationFn: () => teamApi.updateTeam(projectId, teamId, teamName.trim(), team!.version || 0),
    onSuccess: (payload) => {
      if (payload.team) queryClient.setQueryData(['team-detail', teamId], { ...detail, team: payload.team });
      queryClient.invalidateQueries({ queryKey: ['project-teams', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-teams-all', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      setIsEditing(false);
    },
  });

  const deleteTeam = useMutation({
    mutationFn: () => teamApi.deleteTeams(projectId, [teamId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-teams', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-teams-all', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      navigate({ to: '/projects/$projectId/teams', params: { projectId } });
    },
  });

  const addMembers = useMutation({
    mutationFn: () => teamApi.addTeamMembers(projectId, teamId, parsedMemberIds()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-detail', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-members-all', teamId] });
      setMemberIds('');
    },
  });

  const removeMember = useMutation({
    mutationFn: (member: TeamMember) => {
      const userId = member.user?.id;
      if (!userId) throw new Error('Member user ID missing');
      return teamApi.removeTeamMembers(projectId, teamId, [userId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-detail', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-members-all', teamId] });
    },
  });

  if (isLoading) {
    return (
      <div className="page-frame animate-fade-in">
        <LoadingPane title="Loading Team Profile" message="Pulling membership details and activity parameters." />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page-frame animate-fade-in">
        <EmptyState
          icon={Users}
          title="Team not found"
          description="This team profile could not be loaded. It may have been decommissioned or deleted."
        />
      </div>
    );
  }

  return (
    <div className="page-frame animate-fade-in space-y-6">
      {/* Premium Back navigation and Header Board */}
      <div className="flex flex-col gap-4 border-b border-slate-200/50 pb-5">
        <div>
          <button
            onClick={() => navigate({ to: '/projects/$projectId/teams', params: { projectId } })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-app-ink transition duration-300 cursor-pointer shadow-sm mb-4"
          >
            <ArrowLeft size={13} />
            Back to Teams
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent mb-0.5 block">Team Profile</span>
            <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-app-ink">{team.name}</h1>
            <p className="max-w-2xl text-xs leading-relaxed text-app-muted">
              Focus view of team responsibilities, rosters, and activity indicators in project scope.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTeamName(team.name);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-app-ink transition duration-300 cursor-pointer shadow-sm"
            >
              <PencilLine size={13} className="text-app-accent" />
              Edit Team
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this team? Tasks assigned to it will be orphaned.')) deleteTeam.mutate();
              }}
              disabled={deleteTeam.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3.5 py-2 text-xs font-bold text-red-600 transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {deleteTeam.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete Team
            </button>
          </div>
        </div>
      </div>

      {/* Grid Split */}
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        {/* Left column: Metadata Card */}
        <SurfaceCard className="p-5 flex flex-col gap-4 h-fit">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-app-accent">Metadata</span>
            <h3 className="text-sm font-bold text-app-ink mt-0.5">Team Metrics</h3>
          </div>

          <div className="space-y-3.5">
            <div className="rounded-xl bg-slate-100/60 border border-slate-200/35 px-4 py-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1.5">
                <CalendarDays size={12} className="text-app-accent" /> Established
              </span>
              <p className="mt-1 text-xs font-extrabold text-app-ink">{formatDate(team.createdAt)}</p>
            </div>
            <div className="rounded-xl bg-slate-100/60 border border-slate-200/35 px-4 py-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-app-muted flex items-center gap-1.5">
                <Clock size={12} className="text-app-accent-2" /> Last Updated
              </span>
              <p className="mt-1 text-xs font-extrabold text-app-ink">{formatDate(team.updatedAt || team.createdAt)}</p>
            </div>
          </div>
        </SurfaceCard>

        {/* Right column: Members list panel */}
        <SurfaceCardStrong className="p-6 space-y-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/40 pb-5 shrink-0">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-app-accent">Contributors</span>
              <h2 className="text-lg font-bold tracking-tight text-app-ink mt-0.5">Team Roster</h2>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-app-muted border border-slate-200/30">
              {members.length} Members
            </div>
          </div>

          {/* Inline filters and add actions */}
          <div className="grid gap-4 md:grid-cols-2 shrink-0">
            {/* Search */}
            <div className="rounded-xl border border-slate-200/65 bg-slate-50/20 p-3 shadow-inner">
              <label className="block space-y-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-app-ink uppercase tracking-wide opacity-90">
                  <Search size={12} className="text-app-accent" />
                  Roster search
                </span>
                <input
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search team members..."
                  className="w-full rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs text-app-ink outline-none transition focus:border-app-accent focus:bg-white"
                />
              </label>
            </div>

            {/* Add member form */}
            <form
              className="rounded-xl border border-slate-200/65 bg-slate-50/20 p-3 flex items-end gap-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                if (parsedMemberIds().length) addMembers.mutate();
              }}
            >
              <div className="flex-1 w-full">
                <TextField label="Add member user IDs" value={memberIds} onChange={setMemberIds} placeholder="UUIDs..." />
              </div>
              <button
                type="submit"
                disabled={addMembers.isPending || parsedMemberIds().length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-app-accent hover:bg-app-accent/90 px-3 py-2 text-xs font-bold text-white transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
              >
                {addMembers.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add
              </button>
            </form>
          </div>

          <div className="flex-1 min-h-[300px] mt-6">
            {isMembersLoading ? (
              <div className="flex min-h-[16rem] items-center justify-center">
                <Loader2 size={24} className="animate-spin text-app-accent" />
              </div>
            ) : members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team members yet"
                description="Populate this team with contributors from your project roster to track their deliverables."
              />
            ) : (
              <div className="grid gap-3.5 md:grid-cols-2">
                {members.map((member) => {
                  const name = member.user?.username || 'Unknown';
                  const initial = name.slice(0, 2).toUpperCase();
                  return (
                    <div key={member.id} className="rounded-xl border border-slate-200/60 bg-white/60 p-4 transition hover:border-slate-300 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft border border-app-accent/10 text-xs font-extrabold text-app-accent shadow-sm">
                            {initial}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-app-ink">@{name}</p>
                            <p className="text-[10px] text-app-muted mt-0.5">Joined {formatDate(member.createdAt)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Remove this member from the team?')) removeMember.mutate(member);
                          }}
                          disabled={removeMember.isPending}
                          className="rounded-lg p-1.5 text-app-muted hover:bg-red-50 hover:text-red-600 transition duration-300 disabled:opacity-50 cursor-pointer shrink-0"
                          title="Remove member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination deck */}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200/40 pt-5 shrink-0">
            <PagingButton
              disabled={!membersPage?.pageInfo?.hasPreviousPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/teams/$teamId',
                  params: { projectId, teamId },
                  search: { cursor: membersPage?.pageInfo?.startCursor ?? undefined, direction: 'backward' },
                })
              }
            >
              <ArrowLeft size={12} />
              Prev
            </PagingButton>
            <PagingButton
              disabled={!membersPage?.pageInfo?.hasNextPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/teams/$teamId',
                  params: { projectId, teamId },
                  search: { cursor: membersPage?.pageInfo?.endCursor ?? undefined, direction: 'forward' },
                })
              }
            >
              Next
              <ArrowRight size={12} />
            </PagingButton>
          </div>
        </SurfaceCardStrong>
      </div>

      {/* Edit modal */}
      <AppModal open={isEditing} title="Edit team scope" description="Rename this team with optimistic locking." onClose={() => setIsEditing(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (teamName.trim()) updateTeam.mutate();
          }}
        >
          <TextField label="Team Name / Scope" value={teamName} onChange={setTeamName} required />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/50">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-app-ink transition duration-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTeam.isPending || !teamName.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {updateTeam.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save team
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}
