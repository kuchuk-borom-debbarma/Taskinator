import type {
    Project,
    ProjectMember,
    ProjectService,
} from '../ProjectService.ts';
import {
    getProject,
    getProjectMembers,
    getProjectMembersByActorIdAndIds,
    getProjectMembersByIds,
    getProjects,
    getProjectsByActorIdAndProjectIds,
    getProjectsByIds,
} from './ProjectQueries.ts';

import * as queries from './ProjectQueries.ts';

import eventBus from '../../../utils/EventBus.ts';

export class ProjectServiceImpl implements ProjectService {
    async getProjectsOfUser(
        userId: string,
        params?: {
            first?: number;
            after?: string;
            last?: number;
            before?: string;
        },
    ): Promise<{
        projects: Project[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
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
        params?: {
            first?: number;
            after?: string;
            last?: number;
            before?: string;
        },
    ): Promise<{
        members: ProjectMember[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return getProjectMembers(userId, projectId, params);
    }

    async getProjectMembersByIds(
        memberIds: string[],
    ): Promise<ProjectMember[]> {
        return getProjectMembersByIds(memberIds);
    }

    async getProjectMembersByActorIdAndIds(
        userId: string,
        memberIds: string[],
    ): Promise<ProjectMember[]> {
        return getProjectMembersByActorIdAndIds(userId, memberIds);
    }

    async getProjectsByIds(ids: string[]): Promise<Project[]> {
        return getProjectsByIds(ids);
    }

    async getProjectsByActorIdAndProjectIds(
        userId: string,
        projectIds: string[],
    ): Promise<Project[]> {
        return getProjectsByActorIdAndProjectIds(userId, projectIds);
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await eventBus.destroy();
    }

    async init() {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
    }

    async createProject(param: {
        actorId: string;
        name: string;
        description?: string;
    }): Promise<Project | null> {
        const { actorId, name, description } = param;
        return await queries.insertProject({
            userId: actorId,
            name,
            description,
        });
    }

    async updateProject(param: {
        actorId: string;
        id: string;
        version: number;
        name?: string;
        description?: string;
    }): Promise<Project | null> {
        return await queries.updateProject(param);
    }
}
