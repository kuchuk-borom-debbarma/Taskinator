import type { BaseService } from '../project';
import type { User } from '../auth/AuthService.ts';

export type Team = {
    id: string;
    name: string;
    projectId: string;
    createdBy: string;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type TeamMember = {
    id: string;
    projectId: string;
    teamId: string;
    userId: string;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export interface TeamService extends BaseService {
    getTeams(
        userId: string,
        projectId: string | null,
        params?: {
            first?: number;
            after?: string;
            last?: number;
            before?: string;
            memberId?: string;
        },
    ): Promise<{
        teams: Team[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    getTeamMembers(
        userId: string,
        projectId: string,
        teamId: string,
        params?: {
            first?: number;
            after?: string;
            last?: number;
            before?: string;
        },
    ): Promise<{
        members: TeamMember[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    /**
     * Search users who are members of a specific team.
     * Exact match on username or user id. Cursor-paginated.
     */
    searchTeamUsers(params: {
        actorId: string;
        projectId: string;
        teamId: string;
        search?: string;
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    }): Promise<{
        users: User[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    /**
     * Batch fetch teams by IDs. Used by DataLoaders.
     */
    getTeamsByIds(userId: string, teamIds: string[]): Promise<Team[]>;
}

export type { User };
