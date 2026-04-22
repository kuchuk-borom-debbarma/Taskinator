import { logger } from '../../../logger';
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
        logger.debug(
            `TeamService.getTeams called for user: ${userId}, project: ${projectId}`,
        );
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
        logger.debug(`TeamService.getTeamMembers called for team: ${teamId}`);
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
        logger.debug(
            `TeamService.searchTeamUsers called for team: ${params.teamId}, search: ${params.search}`,
        );
        return searchTeamUsers(params);
    }

    async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
        logger.debug(
            `TeamService.getTeamsByIds called for ${teamIds.length} ids`,
        );
        return await getTeamsByIdsQuery(teamIds);
    }

    async getTeamsByActorIdAndIds(
        actorId: string,
        teamIds: string[],
    ): Promise<Team[]> {
        logger.debug(
            `TeamService.getTeamsByActorIdAndIds called for actor: ${actorId}, teams: ${teamIds.length}`,
        );
        return await getTeamsByActorIdAndIds(actorId, teamIds);
    }

    async createTeam(param: {
        actorId: string;
        projectId: string;
        name: string;
    }): Promise<Team> {
        logger.info(
            `TeamService.createTeam started by ${param.actorId} in project ${param.projectId} for "${param.name}"`,
        );
        const result = await insertTeam(param);
        logger.info(`TeamService.createTeam successful: ${result.id}`);
        return result;
    }

    async deleteTeams(param: {
        actorId: string;
        projectId: string;
        teamIds: string[];
    }): Promise<{ deletedCount: number }> {
        logger.info(
            `TeamService.deleteTeams started by ${param.actorId} for ${param.teamIds.length} teams`,
        );
        const result = await deleteTeams(param);
        logger.info(
            `TeamService.deleteTeams completed: deleted ${result.deletedCount} teams`,
        );
        return result;
    }

    async addTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ addedCount: number }> {
        logger.info(
            `TeamService.addTeamMembers started for team ${param.teamId} by ${param.actorId}, users: ${param.userIds.length}`,
        );
        const result = await insertTeamMembers(param);
        logger.info(
            `TeamService.addTeamMembers completed: added ${result.addedCount} members`,
        );
        return result;
    }

    async removeTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ removedCount: number }> {
        logger.info(
            `TeamService.removeTeamMembers started for team ${param.teamId} by ${param.actorId}, users: ${param.userIds.length}`,
        );
        const result = await deleteTeamMembers(param);
        logger.info(
            `TeamService.removeTeamMembers completed: removed ${result.removedCount} members`,
        );
        return result;
    }

    async updateTeam(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        name: string;
        version: number;
    }): Promise<Team> {
        logger.info(
            `TeamService.updateTeam started for ${param.teamId} by ${param.actorId}`,
        );
        const result = await updateTeam(param);
        logger.info(`TeamService.updateTeam successful: ${param.teamId}`);
        return result;
    }

    async init(): Promise<void> {
        logger.info(`TeamService initialized`);
    }

    async destroy(): Promise<void> {
        logger.info(`TeamService destroyed`);
    }
}
