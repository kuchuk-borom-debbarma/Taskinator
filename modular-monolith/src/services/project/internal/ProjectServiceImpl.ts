import type {
    CreateProjectParam,
    Project,
    ProjectMember,
    ProjectService,
} from '../ProjectService.ts';
import {
    deleteProjectMembers,
    deleteProjects,
    insertProject,
    insertProjectMembers,
    insertProjects,
} from './queries/ProjectQueries.ts';

export class ProjectServiceImpl implements ProjectService {
    async deleteProjectMembers(data: {
        userId: string;
        projectId: string;
        memberIds: string[];
    }): Promise<void> {
        await deleteProjectMembers(data);
        //TODO kafka event publish. Ideo to prevent duplicate event publishing
    }

    async deleteProjects(data: {
        userId: string;
        projectIds: string[];
    }): Promise<void> {
        await deleteProjects(data);
        //TODO kafka event publish. Ideo to prevent duplicate event publishing
    }

    async addProjectMembers(data: {
        userId: string;
        projectId: string;
        usersToAdd: string[];
    }): Promise<ProjectMember[]> {
        return await insertProjectMembers(data);
        //TODO kafka event publish. Ideo to prevent duplicate event publishing
    }

    async createProject(data: CreateProjectParam): Promise<Project | null> {
        return await insertProject(data);
        //TODO kafka event publish. Ideo to prevent duplicate event publishing
    }

    async createProjects(data: CreateProjectParam[]): Promise<Project[]> {
        return await insertProjects(data);
        //TODO kafka event publish. Ideo to prevent duplicate event publishing
    }
}
