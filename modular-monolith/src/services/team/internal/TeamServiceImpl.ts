import type {
    AddTeamMembersParam,
    CreateTeamsParam,
    DeleteTeamMembersParam,
    DeleteTeamsParam,
    Team,
    TeamMember,
    TeamService,
} from '../TeamService.ts';
import {
    createEvent,
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/kafka.ts';
import {
    insertTeam,
    deleteTeams,
    insertTeamMembers,
    deleteTeamMembers,
    getTeams,
    getTeamMembers,
} from './TeamQueries.ts';
import { eventBus } from '../../../utils/EventBus.ts';
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

        const events = added.map((a) =>
            createEvent(
                KAFKA_EVENTS.PROJECT_TEAM_MEMBER.ADDED,
                data.projectId,
                {
                    userId: a.userId,
                    projectId: data.projectId,
                    teamId: data.teamId,
                    actorId: data.userId,
                    memberId: a.id,
                },
            ),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT_TEAM_MEMBER, events);

        return added;
    }

    async createTeams(data: CreateTeamsParam): Promise<Team[]> {
        const added = await insertTeam(data);

        const events = added.map((team) =>
            createEvent(KAFKA_EVENTS.PROJECT_TEAM.ADDED, data.projectId, {
                userId: data.userId,
                projectId: data.projectId,
                teamId: team.id,
                name: team.name,
            }),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT_TEAM, events);

        return added;
    }

    async deleteTeamMembers(data: DeleteTeamMembersParam): Promise<string[]> {
        const deleted = await deleteTeamMembers(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teamMembers');
        }

        const events = deleted.map((v) =>
            createEvent(
                KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED,
                data.projectId,
                {
                    userId: v,
                    projectId: data.projectId,
                    teamId: data.teamId,
                    actorId: data.userId,
                },
            ),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT_TEAM_MEMBER, events);

        return deleted;
    }

    async deleteTeams(data: DeleteTeamsParam): Promise<string[]> {
        const deleted = await deleteTeams(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teams');
        }

        const events = deleted.map((d) =>
            createEvent(KAFKA_EVENTS.PROJECT_TEAM.DELETED, data.projectId, {
                userId: data.userId,
                projectId: data.projectId,
                teamId: d,
            }),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT_TEAM, events);

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
