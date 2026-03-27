import type {
    CreateProjectParam,
    Project,
    ProjectMember,
    ProjectService,
} from '../ProjectService.ts';

import {
    deleteProjectMembers,
    deleteProjects,
    insertProject,
    insertProjectMembers,
    insertProjects,
} from './ProjectQueries.ts';

import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../utils/kafka.ts';
import type { Producer } from 'kafkajs';
import { buildKafkaMessage } from '../../../utils/kafka.ts';
import { kafka } from '../../../kafka';

export class ProjectServiceImpl implements ProjectService {
    producer: Producer;

    constructor() {
        this.producer = kafka.producer({
            allowAutoTopicCreation: true,
            idempotent: true,
        });
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting kafka producer ${this.constructor.name}`);
        await this.producer.disconnect();
    }

    async init() {
        console.log(`Connecting producer ${this.constructor.name}`);
        await this.producer.connect();
        console.log(`Connected producer ${this.constructor.name}`);
    }

    async deleteProjectMembers(data: {
        userId: string;
        projectId: string;
        memberIds: string[];
    }): Promise<void> {
        const deleted = await deleteProjectMembers(data);

        if (!deleted.length) {
            throw new Error('Failed to delete any project members');
        }

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_MEMBER,
            messages: deleted.map((v) =>
                buildKafkaMessage({
                    key: data.projectId,
                    type: KAFKA_EVENTS.PROJECT_MEMBER.DELETED,
                    source: `${this.constructor.name}.deleteProjectMembers`,
                    data: {
                        userId: data.userId,
                        projectId: data.projectId,
                        memberId: v.id,
                    },
                }),
            ),
        });
    }

    async deleteProjects(data: {
        userId: string;
        projectIds: string[];
    }): Promise<void> {
        const deleted = await deleteProjects(data);

        if (!deleted.length) {
            throw new Error('Failed to delete any project');
        }

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT,
            messages: deleted.map((project) =>
                buildKafkaMessage({
                    key: project.id,
                    type: KAFKA_EVENTS.PROJECT.DELETED,
                    source: `${this.constructor.name}.deleteProjects`,
                    data: {
                        userId: data.userId,
                        projectId: project.id,
                    },
                }),
            ),
        });
    }

    async addProjectMembers(data: {
        userId: string;
        projectId: string;
        usersToAdd: string[];
    }): Promise<ProjectMember[]> {
        const added = await insertProjectMembers(data);

        if (!added.length) {
            throw new Error('Failed to add any project members');
        }

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT_MEMBER,
            messages: added.map((member) =>
                buildKafkaMessage({
                    key: data.projectId,
                    type: KAFKA_EVENTS.PROJECT_MEMBER.ADDED,
                    source: `${this.constructor.name}.addProjectMembers`,
                    data: {
                        projectId: data.projectId,
                        userId: data.userId,
                        memberId: member.userId,
                    },
                }),
            ),
        });

        return added;
    }

    async createProject(data: CreateProjectParam): Promise<Project | null> {
        const project = await insertProject(data);

        if (!project) {
            throw new Error('Failed to create project');
        }

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT,
            messages: [
                buildKafkaMessage({
                    key: project.id,
                    type: KAFKA_EVENTS.PROJECT.CREATED,
                    source: `${this.constructor.name}.createProject`,
                    data: {
                        projectId: project.id,
                        userId: data.userId,
                        name: project.name,
                    },
                }),
            ],
        });

        return project;
    }

    async createProjects(data: CreateProjectParam[]): Promise<Project[]> {
        const projects = await insertProjects(data);

        if (!projects.length) {
            throw new Error('Failed to create projects');
        }

        await this.producer.send({
            topic: KAFKA_TOPICS.PROJECT,
            messages: projects.map((project) =>
                buildKafkaMessage({
                    key: project.id,
                    type: KAFKA_EVENTS.PROJECT.CREATED,
                    source: `${this.constructor.name}.createProjects`,
                    data: {
                        projectId: project.id,
                        userId: project.userId,
                        name: project.name,
                    },
                }),
            ),
        });

        return projects;
    }
}
