import { db } from '../../../infra/database';
import { logger } from '../../../infra/logger';
import type { PaginationParams } from '../../../infra/types/pagination.ts';
import eventBus from '../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../infra/utils/event-bus';
import { claimEventsAtomic } from '../../../infra/utils/event-bus/idempotency.ts';
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
        totalCount: number;
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

    async handleProjectMemberCountSync(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ): Promise<void> {
        await this.handleProjectCountSync(
            events,
            'project-member-count-group',
            'members_count',
            queries.updateProjectMemberCountsBulk,
        );
    }

    async handleSyncProjectTaskCount(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ): Promise<void> {
        await this.handleProjectCountSync(
            events,
            'project-task-count-group',
            'tasks_count',
            queries.updateProjectTaskCountsBulk,
        );
    }

    async handleSyncProjectTeamCount(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ): Promise<void> {
        await this.handleProjectCountSync(
            events,
            'project-team-count-group',
            'teams_count',
            queries.updateProjectTeamCountsBulk,
        );
    }

    async handleRemoveProjectMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'project-member-removal-group',
            );

            if (unprocessed.length === 0) return;

            const projectMap = new Map<string, Set<string>>();
            for (const event of unprocessed) {
                const { projectId, userIds } = event.data;
                const existing = projectMap.get(projectId) || new Set<string>();
                userIds.forEach((id: string) => existing.add(id));
                projectMap.set(projectId, existing);
            }

            const deltas = Array.from(projectMap.entries()).map(
                ([projectId, userIdsSet]) => ({
                    projectId,
                    userIds: Array.from(userIdsSet),
                }),
            );

            logger.info(
                `[ProjectService] Removing project members for ${deltas.length} projects (from ${unprocessed.length} events)`,
            );

            await queries.purgeProjectMembersBatch(deltas, trx);
        });
    }

    async handleDeleteProjectMember(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'project-decommissioning-group',
            );

            if (unprocessed.length === 0) return;

            const projectIds = Array.from(
                new Set(unprocessed.flatMap((event) => event.data.projectIds)),
            );

            logger.info(
                `[ProjectService] Decommissioning all members for ${projectIds.length} projects (from ${unprocessed.length} events)`,
            );

            await queries.purgeProjectMembersByProjectIdsBatch(projectIds, trx);
        });
    }

    private async handleProjectCountSync(
        events: DomainEvent<{ projectId: string; delta: number }>[],
        groupId: string,
        metricName: string,
        update: (updates: Map<string, number>, trx?: any) => Promise<void>,
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(trx, events, groupId);

            if (unprocessed.length === 0) return;

            const updates = new Map<string, number>();
            for (const event of unprocessed) {
                const { projectId, delta } = event.data;
                updates.set(projectId, (updates.get(projectId) || 0) + delta);
            }

            logger.info(
                `[ProjectService] Syncing ${metricName} for ${updates.size} projects (from ${unprocessed.length} events)`,
            );

            await update(updates, trx);
        });
    }
}
