import { useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Loader2, ShieldCheck, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { ProjectMember } from '../../api/types';
import { EmptyState, formatDate } from '../shared/workspace';

export default function ProjectMembersView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/members' });
  const { projectApi } = useApi();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['project-members', projectId],
    queryFn: ({ pageParam }) => projectApi.getProjectMembers(projectId, 15, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.endCursor ?? undefined : undefined),
    staleTime: 1000 * 60 * 3,
  });

  const members = data?.pages.flatMap((page) => page.members) ?? [];

  return (
    <div className="page-frame">

      <div>
        {isLoading ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <Loader2 size={28} className="animate-spin text-app-accent" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description="Once members are attached to the project, they will appear here with a cleaner access overview."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}

        {hasNextPage ? (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20 disabled:opacity-60"
          >
            {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null}
            Load more members
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: ProjectMember }) {
  const username = member.user?.username || 'Unknown member';
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <div className="surface-card rounded-[28px] p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-lg font-semibold text-app-accent">
          {initial}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-app-ink">{username}</h3>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-app-accent-2-soft px-3 py-1 text-xs font-semibold text-app-accent-2">
            <ShieldCheck size={14} />
            Active project member
          </div>
        </div>
      </div>
      <p className="mt-5 text-sm text-app-muted">Joined {formatDate(member.createdAt)}</p>
    </div>
  );
}
