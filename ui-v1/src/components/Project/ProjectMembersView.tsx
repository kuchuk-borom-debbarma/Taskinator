import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { ProjectMember } from '../../api/types';
import { EmptyState, formatDate } from '../shared/workspace';
import { PagingButton } from '../shared/PagingButton';
import { CONFIG } from '../../config';

export default function ProjectMembersView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/members' });
  const { projectApi } = useApi();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<'forward' | 'backward' | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['project-members', projectId, cursor, direction],
    queryFn: () => projectApi.getProjectMembers(
      projectId,
      direction === 'backward'
        ? { last: CONFIG.PAGINATION.MEMBERS_LIST, before: cursor }
        : { first: CONFIG.PAGINATION.MEMBERS_LIST, after: cursor }
    ),
    staleTime: CONFIG.CACHE.DEFAULT_STALE_TIME,
    placeholderData: (prev) => prev,
  });

  const members = data?.members ?? [];
  const pageInfo = data?.pageInfo;

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
            description="Manage members and access for this project."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-app-line pt-6">
          <PagingButton disabled={!pageInfo?.hasPreviousPage} onClick={handlePrev}>
            <ArrowLeft size={14} />
            Prev
          </PagingButton>
          <PagingButton disabled={!pageInfo?.hasNextPage} onClick={handleNext}>
            Next
            <ArrowRight size={14} />
          </PagingButton>
        </div>
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

        </div>
      </div>
      <p className="mt-5 text-sm text-app-muted">Joined {formatDate(member.createdAt)}</p>
    </div>
  );
}
