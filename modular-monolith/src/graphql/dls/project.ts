import DataLoader from 'dataloader';
import type { Project } from '../../modules/project';
import { projectService } from '../../modules/project';

/**
 * Standard DataLoader for fetching Projects by ID.
 * Use this for internal lookups where authorization is already established.
 */
export const byId = () =>
    new DataLoader<string, Project | null>(
        async (ids) => {
            const projects = await projectService.getProjectsByIds([...ids]);
            const projectMap = new Map(projects.map((p) => [p.id, p]));
            return ids.map((id) => projectMap.get(id) || null);
        },
        { cache: true },
    );

/**
 * Authorization-aware DataLoader.
 * Ensures the actorId has permission to view the projects.
 */
export const byActorIdAndId = () =>
    new DataLoader<{ actorId: string; id: string }, Project | null, string>(
        async (keys) => {
            const actorToProjectIds = new Map<string, string[]>();
            keys.forEach((k) => {
                const ids = actorToProjectIds.get(k.actorId) || [];
                ids.push(k.id);
                actorToProjectIds.set(k.actorId, ids);
            });

            const resultMap = new Map<string, Project>();

            await Promise.all(
                Array.from(actorToProjectIds.entries()).map(
                    async ([actorId, projectIds]) => {
                        const projects =
                            await projectService.getProjectsByActorIdAndProjectIds(
                                actorId,
                                projectIds,
                            );
                        projects.forEach((p) => {
                            resultMap.set(`${actorId}:${p.id}`, p);
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
