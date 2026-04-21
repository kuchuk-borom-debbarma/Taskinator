import DataLoader from 'dataloader';
import { type Team, teamService } from '../../modules/team';

/**
 * Standard DataLoader for fetching Teams by ID.
 * Use this for internal lookups where authorization is already established.
 */
export const byId = () =>
    new DataLoader<string, Team | null>(
        async (ids) => {
            const teams = await teamService.getTeamsByIds([...ids]);
            const teamMap = new Map(teams.map((t) => [t.id, t]));
            return ids.map((id) => teamMap.get(id) || null);
        },
        { cache: true },
    );

/**
 * Authorization-aware DataLoader.
 * Ensures the actorId has permission to view the teams.
 */
export const byActorIdAndId = () =>
    new DataLoader<{ actorId: string; id: string }, Team | null, string>(
        async (keys) => {
            const actorToTeamIds = new Map<string, string[]>();
            keys.forEach((k) => {
                const ids = actorToTeamIds.get(k.actorId) || [];
                ids.push(k.id);
                actorToTeamIds.set(k.actorId, ids);
            });

            const resultMap = new Map<string, Team>();

            await Promise.all(
                Array.from(actorToTeamIds.entries()).map(
                    async ([actorId, teamIds]) => {
                        const teams = await teamService.getTeamsByActorIdAndIds(
                            actorId,
                            teamIds,
                        );
                        teams.forEach((t) => {
                            resultMap.set(`${actorId}:${t.id}`, t);
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
