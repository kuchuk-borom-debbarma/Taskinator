import type {
    AddTeamMembersParam,
    CreateTeamsParam,
    DeleteTeamMembersParam,
    DeleteTeamsParam,
    Team,
    TeamMember,
    TeamService,
} from '../TeamService.ts';
import { KAFKA_EVENTS, eventBus } from '../../../utils/EventBus.ts';
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

        await eventBus.publish(
            KAFKA_EVENTS.PROJECT_TEAM_MEMBER.ADDED,
            added.map((a) => ({
                key: data.projectId,
                data: {
                    userId: a.userId,
                    projectId: data.projectId,
                    teamId: data.teamId,
                    actorId: data.userId,
                    memberId: a.id,
                },
            })),
        );

        return added;
    }

    async createTeams(data: CreateTeamsParam): Promise<Team[]> {
        const added = await insertTeam(data);

        await eventBus.publish(
            KAFKA_EVENTS.PROJECT_TEAM.ADDED,
            added.map((team) => ({
                key: data.projectId,
                data: {
                    userId: data.userId,
                    projectId: data.projectId,
                    teamId: team.id,
                    name: team.name,
                },
            })),
        );

        return added;
    }

    async deleteTeamMembers(data: DeleteTeamMembersParam): Promise<string[]> {
        const deleted = await deleteTeamMembers(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teamMembers');
        }

        await eventBus.publish(
            KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED,
            deleted.map((v) => ({
                key: data.projectId,
                data: {
                    userId: v,
                    projectId: data.projectId,
                    teamId: data.teamId,
                    actorId: data.userId,
                },
            })),
        );

        return deleted;
    }

    async deleteTeams(data: DeleteTeamsParam): Promise<string[]> {
        const deleted = await deleteTeams(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teams');
        }

        await eventBus.publish(
            KAFKA_EVENTS.PROJECT_TEAM.DELETED,
            deleted.map((d) => ({
                key: data.projectId,
                data: {
                    userId: data.userId,
                    projectId: data.projectId,
                    teamId: d,
                },
            })),
        );

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
