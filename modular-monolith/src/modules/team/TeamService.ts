import type { BaseService } from '../project';
import type { User } from '../auth/AuthService.ts';
import type { PaginationParams } from '../../types/pagination.ts';

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
        params?: PaginationParams & {
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
        params?: PaginationParams,
    ): Promise<{
        members: TeamMember[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    /**
     * Search users who are members of a specific team.
     * Exact match on username or user id. Cursor-paginated.
     */
    searchTeamUsers(
        params: {
            actorId: string;
            projectId: string;
            teamId: string;
            search?: string;
        } & PaginationParams,
    ): Promise<{
        users: User[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    /**
     * Unauthorized batch fetch for internal use.
     */
    getTeamsByIds(teamIds: string[]): Promise<Team[]>;

    /**
     * Authorized batch fetch.
     */
    getTeamsByActorIdAndIds(
        actorId: string,
        teamIds: string[],
    ): Promise<Team[]>;
}

export type { User };
