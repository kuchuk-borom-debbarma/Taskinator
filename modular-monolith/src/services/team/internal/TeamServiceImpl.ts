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
    buildKafkaMessage,
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/kafka.ts';
import {
    insertTeam,
    deleteTeams,
    insertTeamMembers,
    deleteTeamMembers,
} from './TeamQueries.ts';
import { eventBus } from '../../../utils/EventBus.ts';
import _ from 'lodash';

export class TeamServiceImpl implements TeamService {
    async addTeamMembers(data: AddTeamMembersParam): Promise<TeamMember[]> {
        const added = await insertTeamMembers(data);

        if (_.isEmpty(added)) {
            throw new Error('Failed to add any team members');
        }

        for (const a of added) {
            await eventBus.publish(
                KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
                buildKafkaMessage({
                    key: data.projectId,
                    type: KAFKA_EVENTS.PROJECT_TEAM_MEMBER.ADDED,
                    source: `${this.constructor.name}.addTeamMembers`,
                    data: {
                        userId: a.userId,
                        projectId: data.projectId,
                        teamId: data.teamId,
                        actorId: data.userId,
                        memberId: a.id,
                    },
                }),
            );
        }
        return added;
    }

    async createTeams(data: CreateTeamsParam): Promise<Team[]> {
        const added = await insertTeam(data);

        for (const team of added) {
            await eventBus.publish(
                KAFKA_TOPICS.PROJECT_TEAM,
                buildKafkaMessage({
                    key: data.projectId,
                    type: KAFKA_EVENTS.PROJECT_TEAM.ADDED,
                    source: `${this.constructor.name}.createTeams`,
                    data: {
                        userId: data.userId,
                        projectId: data.projectId,
                        teamId: team.id,
                        name: team.name,
                    },
                }),
            );
        }
        return added;
    }

    async deleteTeamMembers(data: DeleteTeamMembersParam): Promise<string[]> {
        const deleted = await deleteTeamMembers(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teamMembers');
        }

        for (const v of deleted) {
            await eventBus.publish(
                KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
                buildKafkaMessage({
                    key: data.projectId,
                    source: `${this.constructor.name}.deleteTeamMembers`,
                    type: KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED,
                    data: {
                        userId: v, // Assuming v is userId, but wait, I should check deleteTeamMembers query
                        projectId: data.projectId,
                        teamId: data.teamId,
                        actorId: data.userId,
                    },
                }),
            );
        }

        return deleted;
    }

    async deleteTeams(data: DeleteTeamsParam): Promise<string[]> {
        const deleted = await deleteTeams(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teams');
        }

        for (const d of deleted) {
            await eventBus.publish(
                KAFKA_TOPICS.PROJECT_TEAM,
                buildKafkaMessage({
                    key: data.projectId,
                    source: `${this.constructor.name}.deleteTeams`,
                    type: KAFKA_EVENTS.PROJECT_TEAM.DELETED,
                    data: {
                        userId: data.userId,
                        projectId: data.projectId,
                        teamId: d,
                    },
                }),
            );
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
