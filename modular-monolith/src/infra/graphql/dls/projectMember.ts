import DataLoader from 'dataloader';
import { type ProjectMember, projectService } from '../../../modules/project';

/**
 * Standard DataLoader for fetching ProjectMembers by ID.
 * Use this for internal lookups where authorization is already established.
 */
export const byId = () =>
    new DataLoader<string, ProjectMember | null>(
        async (ids) => {
            const members = await projectService.getProjectMembersByIds([
                ...ids,
            ]);
            const memberMap = new Map(members.map((m) => [m.id, m]));
            return ids.map((id) => memberMap.get(id) || null);
        },
        { cache: true },
    );

/**
 * Authorization-aware DataLoader.
 * Ensures the actorId has permission to view the project members.
 */
export const byActorIdAndId = () =>
    new DataLoader<
        { actorId: string; id: string },
        ProjectMember | null,
        string
    >(
        async (keys) => {
            const actorToMemberIds = new Map<string, string[]>();
            keys.forEach((k) => {
                const ids = actorToMemberIds.get(k.actorId) || [];
                ids.push(k.id);
                actorToMemberIds.set(k.actorId, ids);
            });

            const resultMap = new Map<string, ProjectMember>();

            await Promise.all(
                Array.from(actorToMemberIds.entries()).map(
                    async ([actorId, memberIds]) => {
                        const members =
                            await projectService.getProjectMembersByActorIdAndIds(
                                actorId,
                                memberIds,
                            );
                        members.forEach((m) => {
                            resultMap.set(`${actorId}:${m.id}`, m);
                        });
                    },
                ),
            );

            return keys.map(
                (k) => resultMap.get(`${k.actorId}:${k.id}`) || null,
            );
        },
        {
            cache: true,
            cacheKeyFn: (key) => `${key.actorId}:${key.id}`,
        },
    );
