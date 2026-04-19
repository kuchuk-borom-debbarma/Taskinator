import type {
    AddTeamMembersParam,
    CreateTeamsParam,
    DeleteTeamMembersParam,
    DeleteTeamsParam,
    Team,
    TeamMember,
    TeamService,
    UserResult,
} from '../TeamService.ts';
import eventBus, { KAFKA_EVENTS } from '../../../utils/EventBus.ts';
import {
    insertTeam,
    deleteTeams,
    insertTeamMembers,
    deleteTeamMembers,
    getTeams,
    getTeamsByIds,
    getTeamMembers,
    searchTeamUsers,
} from './TeamQueries.ts';
import _ from 'lodash';

export class TeamServiceImpl implements TeamService {
    async getTeams(
        userId: string,
        projectId: string,
        params?: { first?: number; after?: string; last?: number; before?: string; memberId?: string },
    ): Promise<{ teams: Team[]; nextCursor: string | null; prevCursor: string | null }> {
        return getTeams(userId, projectId || null, params);
    }

    async getTeamsByIds(userId: string, teamIds: string[]): Promise<Team[]> {
        return getTeamsByIds(userId, teamIds);
    }

    async getTeamMembers(
        userId: string,
        projectId: string,
        teamId: string,
        params?: { first?: number; after?: string; last?: number; before?: string },
    ): Promise<{ members: TeamMember[]; nextCursor: string | null; prevCursor: string | null }> {
        return getTeamMembers(userId, projectId, teamId, params);
    }

    async searchTeamUsers(params: {
        actorId: string;
        projectId: string;
        teamId: string;
        search?: string;
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    }): Promise<{ users: UserResult[]; nextCursor: string | null; prevCursor: string | null }> {
        return searchTeamUsers(params);
    }

    async addTeamMembers(data: AddTeamMembersParam): Promise<TeamMember[]> {
        const added = await insertTeamMembers(data);

        if (_.isEmpty(added)) {
            throw new Error('Failed to add any team members');
        }

        return added;
    }

    async createTeams(data: CreateTeamsParam): Promise<Team[]> {
        const added = await insertTeam(data);

        return added;
    }

    async deleteTeamMembers(data: DeleteTeamMembersParam): Promise<string[]> {
        const deleted = await deleteTeamMembers(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teamMembers');
        }

        return deleted;
    }

    async deleteTeams(data: DeleteTeamsParam): Promise<string[]> {
        const deleted = await deleteTeams(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teams');
        }

        return deleted;
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await eventBus.destroy();
    }

    async init(): Promise<void> {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
    }
}
