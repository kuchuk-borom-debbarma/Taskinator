import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { useApi } from './hooks/useApi';
import type { Team } from './api/types';
import { EmptyState, SurfaceCard, SurfaceCardStrong, formatDate } from './components/shared/workspace';
import { CONFIG } from './config';

type TeamSearch = {
  cursor?: string;
  direction?: 'forward' | 'backward';
};

const getCachedTeam = (queryClient: ReturnType<typeof useQueryClient>, teamId: string) => {
  const direct = queryClient.getQueryData<Team>(['team', teamId]);
  if (direct) return direct;

  const teamPages = queryClient.getQueriesData<{ teams: Team[] }>({ queryKey: ['project-teams'] });
  for (const [, page] of teamPages) {
    const match = page?.teams?.find((team) => team.id === teamId);
    if (match) return match;
  }
  return undefined;
};

export default function TeamDetailPage() {
  const { projectId, teamId } = useParams({ strict: false }) as { projectId: string; teamId: string };
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/teams/$teamId' }) as TeamSearch;
  const { teamApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const members = membersData?.members ?? [];
  const isLoading = isDetailLoading || (!!cursor && isMembersLoading);

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
            <div className="rounded-2xl bg-app-accent/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">Version</p>
              <p className="mt-2 text-sm font-semibold text-app-ink">v{team.version ?? 1}</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Members</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">People in this team</h2>
            </div>
            <Link
              to="/projects/$projectId/members"
              params={{ projectId }}
              className="text-sm font-semibold text-app-accent"
            >
              View project members
            </Link>
          </div>

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
                  <p className="text-lg font-semibold text-app-ink">{member.user?.username || 'Unknown member'}</p>
                  <p className="mt-2 text-sm text-app-muted">Joined {formatDate(member.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </SurfaceCardStrong>
      </div>
    </div>
  );
}
