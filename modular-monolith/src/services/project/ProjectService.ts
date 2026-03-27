import type { BaseService } from './index.ts';

export type Project = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt?: Date;
};

export type ProjectMember = {
    id: string;
    projectId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
};

export interface CreateProjectParam {
    name: string;
    description?: string;
    userId: string;
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

    deleteProjects(data: {
        userId: string;
        projectIds: string[];
    }): Promise<void>;

    /**
     * Add members to a project
     */
    addProjectMembers(data: {
        userId: string;
        projectId: string;
        usersToAdd: string[];
    }): Promise<ProjectMember[]>;

    deleteProjectMembers(data: {
        userId: string;
        projectId: string;
        memberIds: string[];
    }): Promise<void>;
}
