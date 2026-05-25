import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Loader2, Plus, Search, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { Team } from '../../api/types';
import { AppModal, EmptyState, SurfaceCardStrong, TextField, formatDate } from '../shared/workspace';
import { PagingButton } from '../shared/PagingButton';
import { CONFIG } from '../../config';
import { useDebounce } from '../../hooks/useDebounce';

type TeamSearch = {
  cursor?: string;
  direction?: 'forward' | 'backward';
};

const getCachedTeams = (queryClient: ReturnType<typeof useQueryClient>) => {
  const teamPages = queryClient.getQueriesData<{ teams: Team[] }>({ queryKey: ['project-teams'] });
  for (const [, page] of teamPages) {
    if (page?.teams?.length) return page.teams;
  }
  return undefined;
};

export default function ProjectTeamsView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/teams' });
  const { cursor, direction } = useSearch({ from: '/authenticated-layout/projects/$projectId/teams' }) as TeamSearch;
  const { teamApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['project-teams', projectId, debouncedSearch, cursor, direction],
    queryFn: () => {
      if (direction === 'backward') {
        return teamApi.getTeams(projectId, { last: CONFIG.PAGINATION.TASKS_LIST, before: cursor, search: debouncedSearch.trim() || undefined });
      }
      return teamApi.getTeams(projectId, { first: CONFIG.PAGINATION.TASKS_LIST, after: direction === 'forward' ? cursor : undefined, search: debouncedSearch.trim() || undefined });
    },
    enabled: !!projectId,
    initialData: () => {
      if (cursor || direction || debouncedSearch) return undefined;
      const teams = getCachedTeams(queryClient);
      return teams
        ? { teams, pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null } }
        : undefined;
    },
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    navigate({
      to: '/projects/$projectId/teams',
      params: { projectId },
      search: { cursor: undefined, direction: undefined }
    });
  };

  const createTeam = useMutation({
    mutationFn: () => teamApi.createTeam(projectId, name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-teams', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      setName('');
      setShowCreate(false);
    },
  });

  const teams = data?.teams ?? [];

  return (
    <div className="page-frame">
      <div className="mt-0 flex items-center justify-between gap-4 py-2">
        <div />
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
        >
          <Plus size={16} />
          New team
        </button>
      </div>

      <div className="mb-6 rounded-[28px] border border-app-line bg-white/70 p-5">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-app-ink">
            <Search size={15} />
            Search teams
          </span>
          <input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by team name..."
            className="w-full rounded-2xl border border-app-line bg-white/80 px-4 py-3 text-sm text-app-ink outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
          />
        </label>
      </div>

      <div className="mt-4">
        <SurfaceCardStrong className="p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Team roster</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-app-ink">Current groups</h2>
            </div>
            <div className="rounded-full bg-app-ink/5 px-3 py-1.5 text-xs font-semibold text-app-muted">
              {teams.length} loaded
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[18rem] items-center justify-center">
              <Loader2 size={28} className="animate-spin text-app-accent" />
            </div>
          ) : teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No teams yet"
              description="Create a team to organize responsibilities and team membership inside this project."
              action={
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90"
                >
                  Create team
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  to="/projects/$projectId/teams/$teamId"
                  params={{ projectId, teamId: team.id }}
                  className="rounded-[28px] border border-app-line bg-white/75 p-5 transition hover:border-app-accent/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>

                      <h3 className="text-xl font-semibold text-app-ink">{team.name}</h3>
                      <p className="mt-2 text-sm text-app-muted">Created {formatDate(team.createdAt)}</p>
                    </div>
                    <ArrowRight size={16} className="text-app-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-app-line pt-6">
            <PagingButton
              disabled={!data?.pageInfo?.hasPreviousPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/teams',
                  params: { projectId },
                  search: {
                    cursor: data?.pageInfo?.startCursor ?? undefined,
                    direction: 'backward',
                  },
                })
              }
            >
              <ArrowLeft size={14} />
              Prev
            </PagingButton>
            <PagingButton
              disabled={!data?.pageInfo?.hasNextPage}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/teams',
                  params: { projectId },
                  search: {
                    cursor: data?.pageInfo?.endCursor ?? undefined,
                    direction: 'forward',
                  },
                })
              }
            >
              Next
              <ArrowRight size={14} />
            </PagingButton>
          </div>
        </SurfaceCardStrong>
      </div>

      <AppModal
        open={showCreate}
        title="Create a team"
        description="Keep team names simple and recognizable so the task flow reads clearly."
        onClose={() => setShowCreate(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createTeam.mutate();
          }}
        >
          <TextField label="Team name" value={name} onChange={setName} placeholder="Platform squad" required />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTeam.isPending || !name.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-60"
            >
              {createTeam.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create team
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}

