import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { ProjectMember } from '../../api/types';
import { EmptyState, TextField, formatDate } from '../shared/workspace';
import { PagingButton } from '../shared/PagingButton';
import { CONFIG } from '../../config';

export default function ProjectMembersView() {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId/members' });
  const { projectApi } = useApi();
  const queryClient = useQueryClient();

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<'forward' | 'backward' | undefined>(undefined);
  const [userIds, setUserIds] = useState('');

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
  const parsedUserIds = () =>
    userIds
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

  const addMembers = useMutation({
    mutationFn: () => projectApi.addProjectMembers(projectId, parsedUserIds()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setUserIds('');
    },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => projectApi.removeProjectMembers(projectId, [memberId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
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
    <div className="page-frame">
      <form
        className="mb-6 flex flex-col gap-3 rounded-[28px] border border-app-line bg-white/70 p-5 md:flex-row md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (parsedUserIds().length) addMembers.mutate();
        }}
      >
        <div className="flex-1">
          <TextField label="Add project member user IDs" value={userIds} onChange={setUserIds} placeholder="UUIDs separated by comma or space" />
        </div>
        <button
          type="submit"
          disabled={addMembers.isPending || parsedUserIds().length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-60"
        >
          {addMembers.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add members
        </button>
      </form>

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

function MemberCard({ member, removing, onRemove }: { member: ProjectMember; removing: boolean; onRemove: () => void }) {
  const username = member.user?.username || 'Unknown member';
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <div className="surface-card rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-lg font-semibold text-app-accent">
          {initial}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-app-ink">{username}</h3>

        </div>
        </div>
        <button
          onClick={onRemove}
          disabled={removing}
          className="rounded-full p-2 text-app-muted transition hover:bg-app-danger/10 hover:text-app-danger disabled:opacity-50"
          title="Remove project member"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <p className="mt-5 text-sm text-app-muted">Joined {formatDate(member.createdAt)}</p>
    </div>
  );
}
