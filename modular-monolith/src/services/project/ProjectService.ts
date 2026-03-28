import type { BaseService } from './index.ts';

export type Project = {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    version: number;
    lastEventId: string | null;
    createdAt: Date;
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

    deleteProjects(data: DeleteProjectsParam): Promise<void>;

    /**
     * Add members to a project
     */
    addProjectMembers(data: AddProjectMembersParam): Promise<ProjectMember[]>;

    deleteProjectMembers(data: DeleteProjectMembersParam): Promise<void>;
}
