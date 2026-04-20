import type { BaseService } from './index.ts';
import type { PaginationParams } from '../../types/pagination.ts';

export type Project = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    epochPrecision?: string; // High-precision string for cursor pagination
    updatedAt?: Date;
};

export type ProjectMember = {
    id: string;
    userId: string;
    projectId: string;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
    epochPrecision?: string;
    updatedAt: Date;
};

export interface ProjectService extends BaseService {
    /**
     * Get projects for a user (owned and joined)
     */
    getProjectsOfUser(
        userId: string,
        params?: PaginationParams,
    ): Promise<{
        projects: Project[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    getProjectMembers(
        userId: string,
        projectId: string,
        params?: PaginationParams,
    ): Promise<{
        members: ProjectMember[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    /**
     * Unauthorized batch fetch for internal use.
     */
    getProjectMembersByIds(memberIds: string[]): Promise<ProjectMember[]>;

    /**
     * Authorized batch fetch.
     */
    getProjectMembersByActorIdAndIds(
        userId: string,
        memberIds: string[],
    ): Promise<ProjectMember[]>;

    /**
     * Unauthorized batch fetch for internal use.
     */
    getProjectsByIds(ids: string[]): Promise<Project[]>;

    /**
     * Authorized batch fetch.
     */
    getProjectsByActorIdAndProjectIds(
        userId: string,
        projectIds: string[],
    ): Promise<Project[]>;

    createProject(param: {
        actorId: string;
        name: string;
        description?: string;
    }): Promise<Project | null>;

    updateProject(param: {
        actorId: string;
        id: string;
        version: number;
        name?: string;
        description?: string;
    }): Promise<Project | null>;

    deleteProjects(param: {
        actorId: string;
        projectIds: string[];
    }): Promise<{ success: boolean; deletedCount: number }>;

    addProjectMembers(param: {
        actorId: string;
        projectId: string;
        userIds: string[];
    }): Promise<boolean>;

    removeProjectMembers(param: {
        actorId: string;
        projectId: string;
        userIds: string[];
    }): Promise<boolean>;
}
