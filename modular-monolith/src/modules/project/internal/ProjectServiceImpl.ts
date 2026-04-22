import { logger } from '../../../logger';
import type { PaginationParams } from '../../../types/pagination.ts';
import eventBus from '../../../utils/EventBus.ts';
import type {
    Project,
    ProjectMember,
    ProjectService,
} from '../ProjectService.ts';

import * as queries from './ProjectQueries.ts';
import {
    getProjectMembers,
    getProjectMembersByActorIdAndIds,
    getProjectMembersByIds,
    getProjects,
    getProjectsByActorIdAndProjectIds,
    getProjectsByIds,
} from './ProjectQueries.ts';

export class ProjectServiceImpl implements ProjectService {
    async getProjectsOfUser(
        userId: string,
        params?: PaginationParams,
    ): Promise<{
        projects: Project[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        logger.debug(
            `ProjectService.getProjectsOfUser called for userId: ${userId}`,
        );
        const result = await getProjects(userId, params);
        logger.debug(
            `ProjectService.getProjectsOfUser returned ${result.projects.length} projects`,
        );
        return result;
    }

    async getProjectMembers(
        userId: string,
        projectId: string,
        params?: PaginationParams,
    ): Promise<{
        members: ProjectMember[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        logger.debug(
            `ProjectService.getProjectMembers called for project: ${projectId}`,
        );
        return getProjectMembers(userId, projectId, params);
    }

    async getProjectMembersByIds(
        memberIds: string[],
    ): Promise<ProjectMember[]> {
        logger.debug(
            `ProjectService.getProjectMembersByIds called for ${memberIds.length} ids`,
        );
        return getProjectMembersByIds(memberIds);
    }

    async getProjectMembersByActorIdAndIds(
        userId: string,
        memberIds: string[],
    ): Promise<ProjectMember[]> {
        logger.debug(
            `ProjectService.getProjectMembersByActorIdAndIds called for actor: ${userId}, members: ${memberIds.length}`,
        );
        return getProjectMembersByActorIdAndIds(userId, memberIds);
    }

    async getProjectsByIds(ids: string[]): Promise<Project[]> {
        logger.debug(
            `ProjectService.getProjectsByIds called for ${ids.length} ids`,
        );
        return getProjectsByIds(ids);
    }

    async getProjectsByActorIdAndProjectIds(
        userId: string,
        projectIds: string[],
    ): Promise<Project[]> {
        logger.debug(
            `ProjectService.getProjectsByActorIdAndProjectIds called for actor: ${userId}, projects: ${projectIds.length}`,
        );
        return getProjectsByActorIdAndProjectIds(userId, projectIds);
    }

    async destroy(): Promise<void> {
        logger.info(`Disconnecting event bus ${this.constructor.name}`);
        await eventBus.destroy();
    }

    async init() {
        logger.info(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
    }

    async createProject(param: {
        actorId: string;
        name: string;
        description?: string;
    }): Promise<Project | null> {
        logger.info(
            `ProjectService.createProject started by ${param.actorId} for "${param.name}"`,
        );

        if (param.name.length < 3 || param.name.length > 255) {
            throw new Error(
                'Project name must be between 3 and 255 characters.',
            );
        }

        const result = await queries.insertProject({
            userId: param.actorId,
            name: param.name,
            description: param.description,
        });
        if (result) {
            logger.info(
                `ProjectService.createProject successful: ${result.id}`,
            );
        } else {
            logger.error(
                `ProjectService.createProject failed for "${param.name}"`,
            );
        }
        return result;
    }

    async updateProject(param: {
        actorId: string;
        id: string;
        version: number;
        name?: string;
        description?: string;
    }): Promise<Project | null> {
        logger.info(
            `ProjectService.updateProject started for ${param.id} by ${param.actorId}`,
        );

        if (
            param.name !== undefined &&
            (param.name.length < 3 || param.name.length > 255)
        ) {
            throw new Error(
                'Project name must be between 3 and 255 characters.',
            );
        }

        const result = await queries.updateProject(param);
        if (result) {
            logger.info(`ProjectService.updateProject successful: ${param.id}`);
        } else {
            logger.warn(
                `ProjectService.updateProject failed for ${param.id} (likely version mismatch or permissions)`,
            );
        }
        return result;
    }

    async deleteProjects(param: {
        actorId: string;
        projectIds: string[];
    }): Promise<{ success: boolean; deletedCount: number }> {
        logger.info(
            `ProjectService.deleteProjects started by ${param.actorId} for ${param.projectIds.length} projects`,
        );
        const result = await queries.deleteProjects(param);
        logger.info(
            `ProjectService.deleteProjects completed: deleted ${result.deletedCount} projects`,
        );
        return result;
    }

    async addProjectMembers(param: {
        actorId: string;
        projectId: string;
        userIds: string[];
    }): Promise<boolean> {
        logger.info(
            `ProjectService.addProjectMembers started for ${param.projectId} by ${param.actorId}, users: ${param.userIds.length}`,
        );
        const result = await queries.insertProjectMembers(param);
        logger.info(`ProjectService.addProjectMembers result: ${result}`);
        return result;
    }

    async removeProjectMembers(param: {
        actorId: string;
        projectId: string;
        userIds: string[];
    }): Promise<boolean> {
        logger.info(
            `ProjectService.removeProjectMembers started for ${param.projectId} by ${param.actorId}, users: ${param.userIds.length}`,
        );
        const result = await queries.deleteProjectMembers(param);
        logger.info(`ProjectService.removeProjectMembers result: ${result}`);
        return result;
    }
}
