import type {Team, TeamService} from '../TeamService.ts';
import type {Producer} from 'kafkajs';
import {kafka} from '../../../kafka';
import {
    buildKafkaMessage,
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/kafka.ts';
import {insertTeam} from "./TeamQueries.ts";

export class TeamServiceImpl implements TeamService {
    producer: Producer;

    constructor() {
        this.producer = kafka.producer({
            idempotent: true,
            allowAutoTopicCreation: true,
        });
    }

    addTeamMembers(data: {
        userId: string;
        projectId: string;
        members: string[];
    }): Promise<Team[]> {
        return Promise.resolve([]);
    }

    async createTeams(data: {
        userId: string;
        projectId: string;
        teams: string[];
    }): Promise<Team[]> {
        const added = await insertTeam(data);
        const addedTeams = added.map(value => value.id);

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

    deleteTeamMembers(data: {
        userId: string;
        projectId: string;
        members: string[];
    }): Promise<Team[]> {
        return Promise.resolve([]);
    }

    deleteTeams(data: {
        userId: string;
        projectId: string;
        teamIds: string[];
    }): Promise<Team[]> {
        return Promise.resolve([]);
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
