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
    getProject,
    getProjects,
    insertProject,
    insertProjectMembers,
    insertProjects,
} from './ProjectQueries.ts';

import {
    KAFKA_TOPICS,
    KAFKA_EVENTS,
    createEvent,
} from '../../../utils/kafka.ts';
import { eventBus } from '../../../utils/EventBus.ts';

export class ProjectServiceImpl implements ProjectService {
    async getProjects(userId: string): Promise<Project[]> {
        console.log(`[Project Service] Getting projects for userId: ${userId}`);
        return getProjects(userId);
    }

    async getProject(
        userId: string,
        projectId: string,
    ): Promise<Project | null> {
        return getProject(userId, projectId);
    }

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

        const events = deleted.map((v) =>
            createEvent(KAFKA_EVENTS.PROJECT_MEMBER.DELETED, data.projectId, {
                userId: v.userId,
                projectId: data.projectId,
                actorId: data.userId,
                memberId: v.id,
            }),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT_MEMBER, events);
    }

    async deleteProjects(data: DeleteProjectsParam): Promise<void> {
        const deleted = await deleteProjects(data);

        if (!deleted.length) {
            throw new Error('Failed to delete any project');
        }

        const events = deleted.map((project) =>
            createEvent(KAFKA_EVENTS.PROJECT.DELETED, project.id, {
                userId: data.userId,
                projectId: project.id,
            }),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT, events);
    }

    async addProjectMembers(
        data: AddProjectMembersParam,
    ): Promise<ProjectMember[]> {
        const added = await insertProjectMembers(data);

        if (!added.length) {
            throw new Error('Failed to add any project members');
        }

        const events = added.map((member) =>
            createEvent(KAFKA_EVENTS.PROJECT_MEMBER.ADDED, data.projectId, {
                projectId: data.projectId,
                userId: member.userId,
                actorId: data.userId,
                memberId: member.id,
            }),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT_MEMBER, events);

        return added;
    }

    async createProject(data: CreateProjectParam): Promise<Project | null> {
        const project = await insertProject(data);

        if (!project) {
            throw new Error('Failed to create project');
        }

        await eventBus.emit(
            KAFKA_TOPICS.PROJECT,
            createEvent(KAFKA_EVENTS.PROJECT.CREATED, project.id, {
                projectId: project.id,
                userId: data.userId,
                name: project.name,
            }),
        );

        return project;
    }

    async createProjects(data: CreateProjectParam[]): Promise<Project[]> {
        const projects = await insertProjects(data);

        if (!projects.length) {
            throw new Error('Failed to create projects');
        }

        const events = projects.map((project) =>
            createEvent(KAFKA_EVENTS.PROJECT.CREATED, project.id, {
                projectId: project.id,
                userId: project.userId,
                name: project.name,
            }),
        );

        await eventBus.emit(KAFKA_TOPICS.PROJECT, events);

        return projects;
    }
}
