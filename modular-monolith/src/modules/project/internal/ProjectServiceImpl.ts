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
    getProjectMembers,
    getProjects,
    getUserProjectIds,
    insertProject,
    insertProjectMembers,
    insertProjects,
} from './ProjectQueries.ts';

import eventBus, { KAFKA_EVENTS } from '../../../utils/EventBus.ts';

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

    async getProjectMembers(
        userId: string,
        projectId: string,
    ): Promise<ProjectMember[]> {
        return getProjectMembers(userId, projectId);
    }

    async getUserProjectIds(userId: string): Promise<string[]> {
        return getUserProjectIds(userId);
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
    }

    async deleteProjects(data: DeleteProjectsParam): Promise<void> {
        const deleted = await deleteProjects(data);

        if (!deleted.length) {
            throw new Error('Failed to delete any project');
        }
    }

    async addProjectMembers(
        data: AddProjectMembersParam,
    ): Promise<ProjectMember[]> {
        const added = await insertProjectMembers(data);

        if (!added.length) {
            throw new Error('Failed to add any project members');
        }

        return added;
    }

    async createProject(data: CreateProjectParam): Promise<Project | null> {
        const project = await insertProject(data);

        if (!project) {
            throw new Error('Failed to create project');
        }

        return project;
    }

    async createProjects(data: CreateProjectParam[]): Promise<Project[]> {
        const projects = await insertProjects(data);

        if (!projects.length) {
            throw new Error('Failed to create projects');
        }

        return projects;
    }
}
