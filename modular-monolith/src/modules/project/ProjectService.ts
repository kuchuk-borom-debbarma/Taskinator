import type { BaseService } from './index.ts';

export type Project = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    createdAtPrecision?: string;
    updatedAt?: Date;
};

export type ProjectMember = {
    id: string;
    userId: string;
    projectId: string;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export interface ProjectService extends BaseService {
    /**
     * Get projects for a user (owned and joined)
     */
    getProjectsOfUser(
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
    }>;

    getProject(userId: string, projectId: string): Promise<Project | null>;

    getProjectMembers(
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
    }>;

    getProjectMembersByIds(
        userId: string,
        memberIds: string[],
    ): Promise<ProjectMember[]>;

    /**
     * Get all project IDs where user is owner or member.
     */
    getUserProjectIds(userId: string): Promise<string[]>;

    /**
     * Batch fetch projects by IDs. Used by DataLoaders.
     */
    getProjectsByActorIdAndProjectIds(
        userId: string,
        projectIds: string[],
    ): Promise<Project[]>;

    searchProjectMembers(params: {
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
    }>;

    getProjectStats(
        userId: string,
        projectId: string,
    ): Promise<{
        teamCount: number;
        taskCount: number;
        memberCount: number;
        taskLabelCounts: { label: string; count: number }[];
    }>;

    getWorkspaceStats(userId: string): Promise<{
        projectCount: number;
        teamCount: number;
        assignedTaskCount: number;
    }>;
}
