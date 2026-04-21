import type { PaginationParams } from '../../../types/pagination.ts';
import type { User } from '../../auth/AuthService.ts';
import type { Team, TeamMember, TeamService } from '../TeamService.ts';
import {
    deleteTeamMembers,
    deleteTeams,
    getTeamMembers,
    getTeams,
    getTeamsByActorIdAndIds,
    getTeamsByIds as getTeamsByIdsQuery,
    insertTeam,
    insertTeamMembers,
    searchTeamUsers,
    updateTeam,
} from './TeamQueries.ts';

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

    async addTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ addedCount: number }> {
        return await insertTeamMembers(param);
    }

    async removeTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ removedCount: number }> {
        return await deleteTeamMembers(param);
    }

    async updateTeam(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        name: string;
        version: number;
    }): Promise<Team> {
        return await updateTeam(param);
    }

    async init(): Promise<void> {
        console.log(`[TeamService] Initializing...`);
    }

    async destroy(): Promise<void> {
        console.log(`[TeamService] Destroying...`);
    }
}
