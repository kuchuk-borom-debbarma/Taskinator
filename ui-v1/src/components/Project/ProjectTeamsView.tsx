import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Loader2, Plus, Search, Users, ArrowUpRight } from 'lucide-react';
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
      queryClient.invalidateQueries({ queryKey: ['project-teams-all', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      setName('');
      setShowCreate(false);
    },
  });

  const teams = data?.teams ?? [];

  return (
    <div className="page-frame animate-fade-in space-y-6">
      {/* Filters and Actions Hub */}
      <div className="grid gap-6 md:grid-cols-[1fr_auto] items-end shrink-0">
        {/* Search */}
        <div className="rounded-[24px] border border-slate-200/60 bg-white/60 p-5 backdrop-blur-md shadow-sm w-full">
          <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-xs font-bold text-app-ink uppercase tracking-wide opacity-90">
              <Search size={13} className="text-app-accent" />
              Filter Teams
            </span>
            <div className="relative">
              <input
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search teams by name..."
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
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-3 text-xs font-bold text-white transition duration-300 cursor-pointer shadow-sm shadow-app-accent/10 w-full md:w-auto"
        >
          <Plus size={14} />
          Create Team
        </button>
      </div>

      {/* Teams Feed Panel */}
      <div>
        <SurfaceCardStrong className="p-6 space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200/40 pb-5 shrink-0">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-app-accent">Team Roster</span>
              <h2 className="text-xl font-bold tracking-tight text-app-ink mt-0.5">Active Groups</h2>
            </div>
          </div>

          <div className="flex-1 min-h-[300px]">
            {isLoading ? (
              <div className="flex min-h-[18rem] items-center justify-center">
                <Loader2 size={24} className="animate-spin text-app-accent" />
              </div>
            ) : teams.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No teams yet"
                description="Establish teams to manage task assignments, timelines, and workload within this project workspace."
                action={
                  <button
                    onClick={() => setShowCreate(true)}
                    className="rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 cursor-pointer shadow-sm"
                  >
                    Create Team
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
                    className="rounded-2xl border border-slate-200/60 hover:border-app-accent/35 bg-slate-50/20 p-5 transition-all duration-300 hover:translate-y-[-1px] shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-app-ink group-hover:text-app-accent transition-colors">{team.name}</h3>
                        <p className="text-[10px] text-app-muted">Established {formatDate(team.createdAt)}</p>
                      </div>
                      <span className="rounded-lg p-1.5 bg-slate-100 text-app-muted group-hover:bg-app-accent-soft group-hover:text-app-accent transition-all duration-300">
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200/40 pt-5 shrink-0">
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
              <ArrowLeft size={12} />
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
              <ArrowRight size={12} />
            </PagingButton>
          </div>
        </SurfaceCardStrong>
      </div>

      {/* Creation Modal */}
      <AppModal
        open={showCreate}
        title="Create new project team"
        description="Establish organizational team structures to delegate task scopes and coordinate execution."
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
          <TextField label="Team Name / Segment" value={name} onChange={setName} placeholder="DevOps Platform Squad..." required />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/50">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-app-ink transition duration-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTeam.isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {createTeam.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Team
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}
