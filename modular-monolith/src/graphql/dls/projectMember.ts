import DataLoader from 'dataloader';
import { projectService, type ProjectMember } from '../../modules/project';

/**
 * Factory for creating a DataLoader that fetches ProjectMembers by their unique ID.
 * Key: { actorId: string; memberId: string }
 * Return: ProjectMember | null
 */
export const byId = () =>
    new DataLoader<{ actorId: string; memberId: string }, ProjectMember | null, string>(
        async (keys) => {
            const actorToMemberIds = new Map<string, string[]>();
            keys.forEach(k => {
                const ids = actorToMemberIds.get(k.actorId) || [];
                ids.push(k.memberId);
                actorToMemberIds.set(k.actorId, ids);
            });

            const resultMap = new Map<string, ProjectMember>();

            await Promise.all(
                Array.from(actorToMemberIds.entries()).map(async ([actorId, memberIds]) => {
                    const members = await projectService.getProjectMembersByIds(actorId, memberIds);
                    members.forEach(m => {
                        resultMap.set(`${actorId}:${m.id}`, m);
                    });
                })
            );

            return keys.map(k => resultMap.get(`${k.actorId}:${k.memberId}`) || null);
        },
        { 
            cache: true,
            cacheKeyFn: (key) => `${key.actorId}:${key.memberId}`
        }
    );
