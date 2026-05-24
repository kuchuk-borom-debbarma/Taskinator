import DataLoader from 'dataloader';
import { authService, type User } from '../../../modules/auth';

/**
 * Factory for creating a DataLoader that fetches Users by their unique ID.
 */
export const byId = () =>
    new DataLoader<string, User | null>(
        async (ids) => {
            const users = await authService.getUsersByIds([...ids]);
            const userMap = new Map(users.map((u) => [u.id, u]));
            return ids.map((id) => userMap.get(id) || null);
        },
        { cache: true },
    );
