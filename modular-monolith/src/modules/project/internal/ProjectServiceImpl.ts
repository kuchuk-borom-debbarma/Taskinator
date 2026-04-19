import type {
    Project,
    ProjectMember,
    ProjectService,
} from '../ProjectService.ts';
import {
    getProject,
    getProjectMembers,
    getProjectMembersByIds,
    getProjects,
    getProjectsByIds,
    getUserProjectIds,
    searchProjectMembers,
} from './ProjectQueries.ts';

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
        userId: string,
        memberIds: string[],
    ): Promise<ProjectMember[]> {
        return getProjectMembersByIds(userId, memberIds);
    }

    async getUserProjectIds(userId: string): Promise<string[]> {
        return getUserProjectIds(userId);
    }

    async getProjectsByActorIdAndProjectIds(
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

    async getProjectStats(
        userId: string,
        projectId: string,
    ): Promise<{
        teamCount: number;
        taskCount: number;
        memberCount: number;
        taskLabelCounts: { label: string; count: number }[];
    }> {
        return (await import('./ProjectQueries.ts')).getProjectStats(
            userId,
            projectId,
        );
    }

    async getWorkspaceStats(userId: string): Promise<{
        projectCount: number;
        teamCount: number;
        assignedTaskCount: number;
    }> {
        return (await import('./ProjectQueries.ts')).getWorkspaceStats(userId);
    }
}
