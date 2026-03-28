import type {
    AddProjectMembersParam,
    CreateProjectParam,
    DeleteProjectMembersParam,
    DeleteProjectsParam,
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
import { buildKafkaMessage } from '../../../utils/kafka.ts';
import { eventBus } from '../../../utils/EventBus.ts';

export class ProjectServiceImpl implements ProjectService {
    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await eventBus.destroy();
    }

    async init() {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
    }

    async deleteProjectMembers(data: DeleteProjectMembersParam): Promise<void> {
        const deleted = await deleteProjectMembers(data);

        if (!deleted.length) {
            throw new Error('Failed to delete any project members');
        }

        const messages = deleted.map((v) =>
            buildKafkaMessage({
                key: data.projectId,
                type: KAFKA_EVENTS.PROJECT_MEMBER.DELETED,
                source: `${this.constructor.name}.deleteProjectMembers`,
                data: {
                    userId: v.userId,
                    projectId: data.projectId,
                    actorId: data.userId,
                    memberId: v.id,
                },
            }),
        );

        await eventBus.publish(KAFKA_TOPICS.PROJECT_MEMBER, messages);
    }

    async deleteProjects(data: DeleteProjectsParam): Promise<void> {
        const deleted = await deleteProjects(data);

        if (!deleted.length) {
            throw new Error('Failed to delete any project');
        }

        const messages = deleted.map((project) =>
            buildKafkaMessage({
                key: project.id,
                type: KAFKA_EVENTS.PROJECT.DELETED,
                source: `${this.constructor.name}.deleteProjects`,
                data: {
                    userId: data.userId,
                    projectId: project.id,
                },
            }),
        );

        await eventBus.publish(KAFKA_TOPICS.PROJECT, messages);
    }

    async addProjectMembers(
        data: AddProjectMembersParam,
    ): Promise<ProjectMember[]> {
        const added = await insertProjectMembers(data);

        if (!added.length) {
            throw new Error('Failed to add any project members');
        }

        const messages = added.map((member) =>
            buildKafkaMessage({
                key: data.projectId,
                type: KAFKA_EVENTS.PROJECT_MEMBER.ADDED,
                source: `${this.constructor.name}.addProjectMembers`,
                data: {
                    projectId: data.projectId,
                    userId: member.userId,
                    actorId: data.userId,
                    memberId: member.id,
                },
            }),
        );

        await eventBus.publish(KAFKA_TOPICS.PROJECT_MEMBER, messages);

        return added;
    }

    async createProject(data: CreateProjectParam): Promise<Project | null> {
        const project = await insertProject(data);

        if (!project) {
            throw new Error('Failed to create project');
        }

        await eventBus.publish(
            KAFKA_TOPICS.PROJECT,
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
        );

        return project;
    }

    async createProjects(data: CreateProjectParam[]): Promise<Project[]> {
        const projects = await insertProjects(data);

        if (!projects.length) {
            throw new Error('Failed to create projects');
        }

        const messages = projects.map((project) =>
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
        );

        await eventBus.publish(KAFKA_TOPICS.PROJECT, messages);

        return projects;
    }
}
