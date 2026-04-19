import type { BaseService } from './index.ts';

export type Project = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    version: number;
    lastEventId: string | null;
    isOwner?: boolean;
    createdAt: Date;
    createdAtPrecision?: string;
    updatedAt?: Date;
};

export type ProjectMember = {
    id: string;
    projectId: string;
    userId: string;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export interface CreateProjectParam {
    name: string;
    description?: string;
    userId: string;
}

export interface DeleteProjectsParam {
    userId: string;
    projectIds: string[];
    // Version is omitted for bulk deletes but could be added for single project updates in future.
}

export interface AddProjectMembersParam {
    userId: string;
    projectId: string;
    usersToAdd: string[];
}

export interface DeleteProjectMembersParam {
    userId: string;
    projectId: string;
    memberIds: string[];
}

export interface ProjectService extends BaseService {
    /**
     * Create single project
     */
    createProject(data: CreateProjectParam): Promise<Project | null>;

    /**
     * Create Multiple project
     */
    createProjects(data: CreateProjectParam[]): Promise<Project[]>;

    updateProject(data: {
        userId: string;
        projectId: string;
        name?: string;
        description?: string | null;
    }): Promise<Project | null>;

    deleteProjects(data: DeleteProjectsParam): Promise<void>;

    /**
     * Add members to a project
     */
    addProjectMembers(data: AddProjectMembersParam): Promise<ProjectMember[]>;

    deleteProjectMembers(data: DeleteProjectMembersParam): Promise<void>;

    /**
     * Get projects for a user (owned and joined)
     */
    getProjects(
        userId: string,
        params?: { first?: number; after?: string; last?: number; before?: string },
    ): Promise<{ projects: Project[]; nextCursor: string | null; prevCursor: string | null }>;

    getProject(userId: string, projectId: string): Promise<Project | null>;

    getProjectMembers(
        userId: string,
        projectId: string,
        params?: { first?: number; after?: string; last?: number; before?: string },
    ): Promise<{ members: ProjectMember[]; nextCursor: string | null; prevCursor: string | null }>;

    /**
     * Get all project IDs where user is owner or member.
     */
    getUserProjectIds(userId: string): Promise<string[]>;

    /**
     * Batch fetch projects by IDs. Used by DataLoaders.
     */
    getProjectsByIds(userId: string, projectIds: string[]): Promise<Project[]>;

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

    getProjectStats(userId: string, projectId: string): Promise<{
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
