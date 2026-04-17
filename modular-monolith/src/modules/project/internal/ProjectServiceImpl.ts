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
    getProjectsByIds,
    getUserProjectIds,
    insertProject,
    insertProjectMembers,
    insertProjects,
    searchProjectMembers,
    updateProject,
} from './ProjectQueries.ts';

import eventBus, { KAFKA_EVENTS } from '../../../utils/EventBus.ts';

export class ProjectServiceImpl implements ProjectService {
    async getProjects(
        userId: string,
        params?: { first?: number; after?: string; last?: number; before?: string },
    ): Promise<{ projects: Project[]; nextCursor: string | null; prevCursor: string | null }> {
        console.log(`[Project Service] Getting projects for userId: ${userId}`);
        return getProjects(userId, params);
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
        params?: { first?: number; after?: string; last?: number; before?: string },
    ): Promise<{ members: ProjectMember[]; nextCursor: string | null; prevCursor: string | null }> {
        return getProjectMembers(userId, projectId, params);
    }

    async getUserProjectIds(userId: string): Promise<string[]> {
        return getUserProjectIds(userId);
    }

    async getProjectsByIds(
        userId: string,
        projectIds: string[],
    ): Promise<Project[]> {
        return getProjectsByIds(userId, projectIds);
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

    async searchProjectMembers(params: {
        actorId: string;
        projectId: string;
        search?: string;
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    }): Promise<{
        users: { id: string; username: string; email: string }[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return searchProjectMembers(params);
    }

    async updateProject(data: {
        userId: string;
        projectId: string;
        name?: string;
        description?: string | null;
    }): Promise<Project | null> {
        const project = await updateProject(data);
        if (!project)
            throw new Error('Failed to update project or unauthorized');
        return project;
    }
}
