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

        const messages = added.map((a) =>
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

        await eventBus.publish(KAFKA_TOPICS.PROJECT_TEAM_MEMBER, messages);
        
        return added;
    }

    async createTeams(data: CreateTeamsParam): Promise<Team[]> {
        const added = await insertTeam(data);

        const messages = added.map((team) =>
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

        await eventBus.publish(KAFKA_TOPICS.PROJECT_TEAM, messages);

        return added;
    }

    async deleteTeamMembers(data: DeleteTeamMembersParam): Promise<string[]> {
        const deleted = await deleteTeamMembers(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teamMembers');
        }

        const messages = deleted.map((v) =>
            buildKafkaMessage({
                key: data.projectId,
                source: `${this.constructor.name}.deleteTeamMembers`,
                type: KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED,
                data: {
                    userId: v,
                    projectId: data.projectId,
                    teamId: data.teamId,
                    actorId: data.userId,
                },
            }),
        );

        await eventBus.publish(KAFKA_TOPICS.PROJECT_TEAM_MEMBER, messages);

        return deleted;
    }

    async deleteTeams(data: DeleteTeamsParam): Promise<string[]> {
        const deleted = await deleteTeams(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teams');
        }

        const messages = deleted.map((d) =>
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

        await eventBus.publish(KAFKA_TOPICS.PROJECT_TEAM, messages);

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
