import type { Team, TeamMember, TeamService } from '../TeamService.ts';
import type { PaginationParams } from '../../../types/pagination.ts';
import {
    getTeamMembers,
    getTeams,
    getTeamsByActorIdAndIds,
    getTeamsByIds as getTeamsByIdsQuery,
    insertTeam,
    deleteTeams,
    searchTeamUsers,
} from './TeamQueries.ts';
import type { User } from '../../auth/AuthService.ts';

export class TeamServiceImpl implements TeamService {
    async getTeams(
        userId: string,
        projectId: string | null,
        params?: PaginationParams & { memberId?: string },
    ): Promise<{
        teams: Team[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return getTeams(userId, projectId, params);
    }

    async getTeamMembers(
        userId: string,
        projectId: string,
        teamId: string,
        params?: PaginationParams,
    ): Promise<{
        members: TeamMember[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return getTeamMembers(userId, projectId, teamId, params);
    }

    async searchTeamUsers(
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
    }> {
        return searchTeamUsers(params);
    }

    async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
        return await getTeamsByIdsQuery(teamIds);
    }

    async getTeamsByActorIdAndIds(
        actorId: string,
        teamIds: string[],
    ): Promise<Team[]> {
        return await getTeamsByActorIdAndIds(actorId, teamIds);
    }

    async createTeam(param: {
        actorId: string;
        projectId: string;
        name: string;
    }): Promise<Team> {
        return await insertTeam(param);
    }

    async deleteTeams(param: {
        actorId: string;
        projectId: string;
        teamIds: string[];
    }): Promise<{ deletedCount: number }> {
        return await deleteTeams(param);
    }

    async init(): Promise<void> {
        console.log(`[TeamService] Initializing...`);
    }

    async destroy(): Promise<void> {
        console.log(`[TeamService] Destroying...`);
    }
}
