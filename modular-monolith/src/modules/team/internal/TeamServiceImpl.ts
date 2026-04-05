import type {
    AddTeamMembersParam,
    CreateTeamsParam,
    DeleteTeamMembersParam,
    DeleteTeamsParam,
    Team,
    TeamMember,
    TeamService,
} from '../TeamService.ts';
import eventBus, { KAFKA_EVENTS } from '../../../utils/EventBus.ts';
import {
    insertTeam,
    deleteTeams,
    insertTeamMembers,
    deleteTeamMembers,
    getTeams,
    getTeamMembers,
} from './TeamQueries.ts';
import _ from 'lodash';

export class TeamServiceImpl implements TeamService {
    async getTeams(userId: string, projectId: string): Promise<Team[]> {
        return getTeams(userId, projectId);
    }

    async getTeamMembers(
        userId: string,
        projectId: string,
        teamId: string,
    ): Promise<TeamMember[]> {
        return getTeamMembers(userId, projectId, teamId);
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
