import { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Loader2, PencilLine, Plus, Save, Trash2, Users, X } from 'lucide-react';
import { useApi } from './hooks/useApi';
import type { TeamMember } from './api/types';
import { AppModal, EmptyState, SurfaceCard, SurfaceCardStrong, TextField, formatDate } from './components/shared/workspace';
import { CONFIG } from './config';

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

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['team-detail', teamId],
    queryFn: () => teamApi.getTeamDetail(teamId),
    enabled: !!teamId,
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  const team = detail?.team;

  const { data: membersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ['team-members', teamId, cursor, direction],
    queryFn: () =>
      teamApi.getTeamMembers(projectId, teamId, {
        first: direction === 'backward' ? undefined : CONFIG.PAGINATION.MEMBERS_LIST,
        after: direction === 'forward' ? cursor : undefined,
        last: direction === 'backward' ? CONFIG.PAGINATION.MEMBERS_LIST : undefined,
        before: direction === 'backward' ? cursor : undefined,
      }),
    enabled: !!projectId && !!teamId && !!cursor, // Only for pagination
    initialData: cursor ? undefined : detail?.members,
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  const membersPage = cursor ? membersData : detail?.members;
  const members = membersPage?.members ?? [];
  const isLoading = isDetailLoading || (!!cursor && isMembersLoading);

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
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      setIsEditing(false);
    },
  });

  const deleteTeam = useMutation({
    mutationFn: () => teamApi.deleteTeams(projectId, [teamId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-teams', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      navigate({ to: '/projects/$projectId/teams', params: { projectId } });
    },
  });

  const addMembers = useMutation({
    mutationFn: () => teamApi.addTeamMembers(projectId, teamId, parsedMemberIds()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-detail', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
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
    },
  });

  if (isLoading) {
    return (
      <div className="page-frame">
        <div className="flex min-h-[18rem] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-app-accent" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page-frame">
        <EmptyState
          icon={Users}
          title="Team not found"
          description="This team could not be loaded. It may have been removed or the project context changed."
        />
      </div>
    );
  }

  return (
    <div className="page-frame">
      <SurfaceCardStrong className="hero-gradient p-6 md:p-8">
        <button
          onClick={() => navigate({ to: '/projects/$projectId/teams', params: { projectId } })}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
        >
          <ArrowLeft size={15} />
          Back to teams
        </button>
        <div className="mb-5 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setTeamName(team.name);
              setIsEditing(true);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            <PencilLine size={15} />
            Edit team
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this team? Tasks assigned to it may be orphaned by backend rules.')) deleteTeam.mutate();
            }}
            disabled={deleteTeam.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-app-danger/20 bg-app-danger/10 px-4 py-2 text-sm font-semibold text-app-danger transition hover:bg-app-danger/15 disabled:opacity-60"
          >
            {deleteTeam.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete team
          </button>
        </div>
        <p className="eyebrow mb-3">Team detail</p>
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-app-ink">{team.name}</h1>
        <p className="mt-3 text-base leading-7 text-app-muted">
          Clean membership visibility for a single team, without losing the surrounding project context.
        </p>
      </SurfaceCardStrong>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <SurfaceCard className="p-5">
          <p className="eyebrow mb-2">Team meta</p>
          <div className="space-y-3 text-sm text-app-muted">
            <div className="rounded-2xl bg-app-accent/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">Created</p>
              <p className="mt-2 text-sm font-semibold text-app-ink">{formatDate(team.createdAt)}</p>
            </div>
            <div className="rounded-2xl bg-app-accent/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">Updated</p>
              <p className="mt-2 text-sm font-semibold text-app-ink">{formatDate(team.updatedAt || team.createdAt)}</p>
            </div>

          </div>
        </SurfaceCard>

        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Members</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">People in this team</h2>
            </div>
            <div className="rounded-full bg-app-ink/5 px-3 py-1.5 text-xs font-semibold text-app-muted">{members.length} loaded</div>
          </div>

          <form
            className="mb-6 flex flex-col gap-3 rounded-[24px] border border-app-line bg-white/70 p-4 md:flex-row md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (parsedMemberIds().length) addMembers.mutate();
            }}
          >
            <div className="flex-1">
              <TextField label="Add member user IDs" value={memberIds} onChange={setMemberIds} placeholder="UUIDs separated by comma or space" />
            </div>
            <button
              type="submit"
              disabled={addMembers.isPending || parsedMemberIds().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-60"
            >
              {addMembers.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add members
            </button>
          </form>

          {isMembersLoading ? (
            <div className="flex min-h-[16rem] items-center justify-center">
              <Loader2 size={24} className="animate-spin text-app-accent" />
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="Add members to this team from the backend flows, then this detail page becomes the ownership snapshot."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {members.map((member) => (
                <div key={member.id} className="rounded-[24px] border border-app-line bg-white/75 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-app-ink">{member.user?.username || 'Unknown member'}</p>
                      <p className="mt-2 text-sm text-app-muted">Joined {formatDate(member.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => removeMember.mutate(member)}
                      disabled={removeMember.isPending}
                      className="rounded-full p-2 text-app-muted transition hover:bg-app-danger/10 hover:text-app-danger disabled:opacity-50"
                      title="Remove member"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-app-line pt-6">
            <button
              disabled={!membersPage?.pageInfo?.hasPreviousPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/teams/$teamId',
                  params: { projectId, teamId },
                  search: { cursor: membersPage?.pageInfo?.startCursor ?? undefined, direction: 'backward' },
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20 disabled:opacity-40"
            >
              <ArrowLeft size={14} />
              Prev
            </button>
            <button
              disabled={!membersPage?.pageInfo?.hasNextPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/teams/$teamId',
                  params: { projectId, teamId },
                  search: { cursor: membersPage?.pageInfo?.endCursor ?? undefined, direction: 'forward' },
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20 disabled:opacity-40"
            >
              Next
              <ArrowRight size={14} />
            </button>
          </div>
        </SurfaceCardStrong>
      </div>

      <AppModal open={isEditing} title="Edit team" description="Rename this team with optimistic locking." onClose={() => setIsEditing(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (teamName.trim()) updateTeam.mutate();
          }}
        >
          <TextField label="Team name" value={teamName} onChange={setTeamName} required />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTeam.isPending || !teamName.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-60"
            >
              {updateTeam.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save team
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}
