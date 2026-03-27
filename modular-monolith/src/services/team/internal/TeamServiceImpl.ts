import type {Team, TeamMember, TeamService} from '../TeamService.ts';
import type {Producer} from 'kafkajs';
import {kafka} from '../../../kafka';
import {
    buildKafkaMessage,
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/kafka.ts';
import {insertTeam, deleteTeams, insertTeamMembers, deleteTeamMembers} from './TeamQueries.ts';
import _ from 'lodash';

export class TeamServiceImpl implements TeamService {
    producer: Producer;

    constructor() {
        this.producer = kafka.producer({
            idempotent: true,
            allowAutoTopicCreation: true,
        });
    }

    async addTeamMembers(data: {
        userId: string;
        projectId: string;
        teamId: string;
        members: string[];
    }): Promise<TeamMember[]> {
        const added = await insertTeamMembers(data);

        if (_.isEmpty(added)) {
            throw new Error('Failed to add any team members');
        }

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
            messages: added.map((a) =>
                buildKafkaMessage({
                    key: data.projectId,
                    type: KAFKA_EVENTS.PROJECT_TEAM_MEMBER.ADDED,
                    source: `${this.constructor.name}.addTeamMembers`,
                    data: JSON.stringify({
                        userId: data.userId,
                        projectId: data.projectId,
                        teamId: data.teamId,
                        memberId: a.id,
                    }),
                }),
            ),
        });
        return added;
    }

    async createTeams(data: {
        userId: string;
        projectId: string;
        teams: string[];
    }): Promise<Team[]> {
        const added = await insertTeam(data);
        const addedTeams = added.map((value) => value.id);

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_TEAM,
            messages: addedTeams.map((v) =>
                buildKafkaMessage({
                    key: data.projectId,
                    type: KAFKA_EVENTS.PROJECT_TEAM.ADDED,
                    source: `${this.constructor.name}.createTeams`,
                    data: {
                        userId: data.userId,
                        projectId: data.projectId,
                        teamId: v,
                    },
                }),
            ),
        });
        return added;
    }

    async deleteTeamMembers(data: {
        userId: string;
        projectId: string;
        teamId: string;
        members: string[];
    }): Promise<string[]> {
        const deleted = await deleteTeamMembers(data)

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teamMembers');
        }

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
            messages: deleted.map((v) => buildKafkaMessage({
                    key: data.projectId,
                    source: `${this.constructor.name}.deleteTeamMembers`,
                    type: KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED,
                    data: JSON.stringify({
                        userId: data.userId,
                        projectId: data.projectId,
                        teamId: data.teamId,
                        memberId: v
                    })
                }
            ))
        })

        return deleted;
    }

    async deleteTeams(data: {
        userId: string;
        projectId: string;
        teamIds: string[];
    }): Promise<string[]> {
        const deleted = await deleteTeams(data);

        if (_.isEmpty(deleted)) {
            throw new Error('Failed to delete any teams');
        }
        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_TEAM,
            messages: deleted.map((d) =>
                buildKafkaMessage({
                    key: data.projectId,
                    source: `${this.constructor.name}.deleteTeams`,
                    type: KAFKA_EVENTS.PROJECT_TEAM.DELETED,
                    data: JSON.stringify({
                        userId: data.userId,
                        projectId: data.projectId,
                        teamId: d,
                    }),
                }),
            ),
        });
        return deleted;
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting kafka producer ${this.constructor.name}`);
        await this.producer.disconnect();
    }

    async init(): Promise<void> {
        console.log(`Connecting kafka producer ${this.constructor.name}`);
        await this.producer.connect();
        console.log(`Connected kafka producer ${this.constructor.name}`);
    }
}
