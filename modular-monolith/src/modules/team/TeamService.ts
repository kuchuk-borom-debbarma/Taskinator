import type { PaginationParams } from '../../infra/types/pagination.ts';
import type { DomainEvent } from '../../infra/utils/event-bus';
import type { User } from '../auth/AuthService.ts';
import type { BaseService } from '../project';

export type Team = {
    id: string;
    name: string;
    projectId: string;
    createdBy: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    membersCount: number;
    tasksCount: number;
};

export type TeamMember = {
    id: string;
    projectId: string;
    teamId: string;
    userId: string;
    version: number;
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

    createTeam(param: {
        actorId: string;
        projectId: string;
        name: string;
    }): Promise<Team>;

    deleteTeams(param: {
        actorId: string;
        projectId: string;
        teamIds: string[];
    }): Promise<{ deletedCount: number }>;

    addTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ addedCount: number }>;

    removeTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ removedCount: number }>;

    updateTeam(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        name: string;
        version: number;
    }): Promise<Team>;

    handleSyncTeamMemberCount(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ): Promise<void>;

    handleRemoveProjectTeamMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ): Promise<void>;

    handleDeleteProjectTeamMember(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void>;

    handleDeleteProjectTeam(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void>;

    handlePurgeTeamMemberships(
        events: DomainEvent<{ teamIds: string[] }>[],
    ): Promise<void>;

    handleSyncTeamTaskCount(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ): Promise<void>;
}

export type { User };
