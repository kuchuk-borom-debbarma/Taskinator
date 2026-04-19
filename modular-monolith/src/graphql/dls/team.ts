import DataLoader from 'dataloader';
import { teamService, type Team } from '../../modules/team';

/**
 * Factory for creating a DataLoader that fetches Teams by their unique ID.
 * Key: { actorId: string, teamId: string }
 * Return: Team | null
 */
export const byId = () =>
    new DataLoader<{ actorId: string; teamId: string }, Team | null, string>(
        async (keys) => {
            const actorToTeamIds = new Map<string, string[]>();
            keys.forEach(k => {
                const ids = actorToTeamIds.get(k.actorId) || [];
                ids.push(k.teamId);
                actorToTeamIds.set(k.actorId, ids);
            });

            const resultMap = new Map<string, Team>();

            await Promise.all(
                Array.from(actorToTeamIds.entries()).map(async ([actorId, teamIds]) => {
                    const teams = await teamService.getTeamsByIds(actorId, teamIds);
                    teams.forEach(t => {
                        resultMap.set(`${actorId}:${t.id}`, t);
                    });
                })
            );

            return keys.map(k => resultMap.get(`${k.actorId}:${k.teamId}`) || null);
        },
        { 
            cache: true,
            cacheKeyFn: (key) => `${key.actorId}:${key.teamId}`
        }
    );
