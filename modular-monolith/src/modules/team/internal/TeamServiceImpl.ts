import { db } from '../../../infra/database';
import { logger } from '../../../infra/logger';
import { traceMethod } from '../../../infra/tracing';
import type { PaginationParams } from '../../../infra/types/pagination.ts';
import type { DomainEvent } from '../../../infra/utils/event-bus';
import { claimEventsAtomic } from '../../../infra/utils/event-bus/idempotency.ts';
import type { User } from '../../auth/AuthService.ts';
import type { Team, TeamMember, TeamService } from '../TeamService.ts';
import {
    deleteProjectTeamBatch,
    deleteProjectTeamMemberBatch,
    deleteTeamMembers,
    deleteTeams,
    getTeamMembers,
    getTeams,
    getTeamsByActorIdAndIds,
    getTeamsByIds as getTeamsByIdsQuery,
    incrementTeamMemberCountsBulk,
    insertTeam,
    insertTeamMembers,
    purgeTeamMembershipsByTeamIdsBatch,
    removeProjectTeamMembersBatch,
    searchTeamUsers,
    updateTeam,
    updateTeamTaskCountsBulk,
} from './TeamQueries.ts';

const CONTAINER = {
    containerId: 'team-module',
    containerName: 'Team Module',
    containerType: 'Logical Domain Module',
} as const;

export class TeamServiceImpl implements TeamService {
    async getTeams(
        userId: string,
        projectId: string | null,
        params?: PaginationParams & { memberId?: string },
    ): Promise<{
        teams: Team[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.getTeams' },
            async () => {
                logger.debug(
                    `TeamService.getTeams called for user: ${userId}, project: ${projectId}`,
                );
                return getTeams(userId, projectId, params);
            },
        );
    }

    async getTeamMembers(
        userId: string,
        projectId: string,
        teamId: string,
        params?: PaginationParams,
    ): Promise<{
        members: TeamMember[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.getTeamMembers' },
            async () => {
                logger.debug(
                    `TeamService.getTeamMembers called for team: ${teamId}`,
                );
                return getTeamMembers(userId, projectId, teamId, params);
            },
        );
    }

    async searchTeamUsers(
        params: {
            actorId: string;
            projectId: string;
            teamId: string;
            search?: string;
        } & PaginationParams,
    ): Promise<{
        users: User[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.searchTeamUsers' },
            async () => {
                logger.debug(
                    `TeamService.searchTeamUsers called for team: ${params.teamId}, search: ${params.search}`,
                );
                return searchTeamUsers(params);
            },
        );
    }

    async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.getTeamsByIds' },
            async () => {
                logger.debug(
                    `TeamService.getTeamsByIds called for ${teamIds.length} ids`,
                );
                return await getTeamsByIdsQuery(teamIds);
            },
        );
    }

    async getTeamsByActorIdAndIds(
        actorId: string,
        teamIds: string[],
    ): Promise<Team[]> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.getTeamsByActorIdAndIds' },
            async () => {
                logger.debug(
                    `TeamService.getTeamsByActorIdAndIds called for actor: ${actorId}, teams: ${teamIds.length}`,
                );
                return await getTeamsByActorIdAndIds(actorId, teamIds);
            },
        );
    }

    async createTeam(param: {
        actorId: string;
        projectId: string;
        name: string;
    }): Promise<Team> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.createTeam' },
            async () => {
                logger.info(
                    `TeamService.createTeam started by ${param.actorId} in project ${param.projectId} for "${param.name}"`,
                );

                if (param.name.length < 3 || param.name.length > 255) {
                    throw new Error(
                        'Team name must be between 3 and 255 characters.',
                    );
                }

                const result = await insertTeam(param);
                logger.info(`TeamService.createTeam successful: ${result.id}`);
                return result;
            },
        );
    }

    async deleteTeams(param: {
        actorId: string;
        projectId: string;
        teamIds: string[];
    }): Promise<{ deletedCount: number }> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.deleteTeams' },
            async () => {
                logger.info(
                    `TeamService.deleteTeams started by ${param.actorId} for ${param.teamIds.length} teams`,
                );
                const result = await deleteTeams(param);
                logger.info(
                    `TeamService.deleteTeams completed: deleted ${result.deletedCount} teams`,
                );
                return result;
            },
        );
    }

    async addTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ addedCount: number }> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.addTeamMembers' },
            async () => {
                logger.info(
                    `TeamService.addTeamMembers started for team ${param.teamId} by ${param.actorId}, users: ${param.userIds.length}`,
                );
                const result = await insertTeamMembers(param);
                logger.info(
                    `TeamService.addTeamMembers completed: added ${result.addedCount} members`,
                );
                return result;
            },
        );
    }

    async removeTeamMembers(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        userIds: string[];
    }): Promise<{ removedCount: number }> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.removeTeamMembers' },
            async () => {
                logger.info(
                    `TeamService.removeTeamMembers started for team ${param.teamId} by ${param.actorId}, users: ${param.userIds.length}`,
                );
                const result = await deleteTeamMembers(param);
                logger.info(
                    `TeamService.removeTeamMembers completed: removed ${result.removedCount} members`,
                );
                return result;
            },
        );
    }

    async updateTeam(param: {
        actorId: string;
        projectId: string;
        teamId: string;
        name: string;
        version: number;
    }): Promise<Team> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.updateTeam' },
            async () => {
                logger.info(
                    `TeamService.updateTeam started for ${param.teamId} by ${param.actorId}`,
                );

                if (param.name.length < 3 || param.name.length > 255) {
                    throw new Error(
                        'Team name must be between 3 and 255 characters.',
                    );
                }

                const result = await updateTeam(param);
                logger.info(
                    `TeamService.updateTeam successful: ${param.teamId}`,
                );
                return result;
            },
        );
    }

    async handleSyncTeamMemberCount(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ): Promise<void> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.handleSyncTeamMemberCount' },
            async () => {
                if (events.length === 0) return;

                await db.transaction().execute(async (trx) => {
                    const unprocessed = await claimEventsAtomic(
                        trx,
                        events,
                        'team-member-count-group',
                    );
                    if (unprocessed.length === 0) return;

                    const updates = this.consolidateTeamDeltas(unprocessed);
                    logger.info(
                        `[TeamAggregated -> Team] Performing bulk update for ${updates.size} teams (from ${unprocessed.length} events)`,
                    );
                    await incrementTeamMemberCountsBulk(trx, updates);
                });
            },
        );
    }

    async handleRemoveProjectTeamMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ): Promise<void> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.handleRemoveProjectTeamMember' },
            async () => {
                if (events.length === 0) return;

                await db.transaction().execute(async (trx) => {
                    const unprocessed = await claimEventsAtomic(
                        trx,
                        events,
                        'team-project-member-purge-group',
                    );
                    if (unprocessed.length === 0) return;

                    const projectMap = new Map<string, Set<string>>();
                    for (const event of unprocessed) {
                        const { projectId, userIds } = event.data;
                        const existing =
                            projectMap.get(projectId) ?? new Set<string>();
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
                        `[ProjectAggregated -> Team] Executing consolidated batch removal of memberships for ${deltas.length} projects (from ${unprocessed.length} events)`,
                    );

                    const { affectedProjectCount, affectedTeamCount } =
                        await removeProjectTeamMembersBatch(deltas, trx);
                    logger.info(
                        `[ProjectAggregated -> Team] Successfully purged memberships across ${affectedProjectCount} projects and repaired ${affectedTeamCount} team counters`,
                    );
                });
            },
        );
    }

    async handleDeleteProjectTeamMember(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.handleDeleteProjectTeamMember' },
            async () => {
                if (events.length === 0) return;

                await db.transaction().execute(async (trx) => {
                    const unprocessed = await claimEventsAtomic(
                        trx,
                        events,
                        'team-membership-decommissioning-group',
                    );
                    if (unprocessed.length === 0) return;

                    const projectIds = this.collectProjectIds(unprocessed);
                    logger.info(
                        `[ProjectAggregated -> Team] Decommissioning team members for ${projectIds.length} projects (from ${unprocessed.length} events)`,
                    );

                    const { affectedCount } =
                        await deleteProjectTeamMemberBatch(projectIds, trx);
                    logger.info(
                        `[ProjectAggregated -> Team] Successfully purged ${affectedCount} team membership records`,
                    );
                });
            },
        );
    }

    async handleDeleteProjectTeam(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.handleDeleteProjectTeam' },
            async () => {
                if (events.length === 0) return;

                await db.transaction().execute(async (trx) => {
                    const unprocessed = await claimEventsAtomic(
                        trx,
                        events,
                        'team-decommissioning-group',
                    );
                    if (unprocessed.length === 0) return;

                    const projectIds = this.collectProjectIds(unprocessed);
                    logger.info(
                        `[ProjectAggregated -> Team] Decommissioning teams for ${projectIds.length} projects (from ${unprocessed.length} events)`,
                    );

                    const { affectedCount } = await deleteProjectTeamBatch(
                        projectIds,
                        trx,
                    );
                    logger.info(
                        `[ProjectAggregated -> Team] Successfully purged ${affectedCount} team entities`,
                    );
                });
            },
        );
    }

    async handlePurgeTeamMemberships(
        events: DomainEvent<{ teamIds: string[] }>[],
    ): Promise<void> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.handlePurgeTeamMemberships' },
            async () => {
                if (events.length === 0) return;

                await db.transaction().execute(async (trx) => {
                    const unprocessed = await claimEventsAtomic(
                        trx,
                        events,
                        'team-membership-purge-group',
                    );
                    if (unprocessed.length === 0) return;

                    const teamIds = Array.from(
                        new Set(
                            unprocessed.flatMap((event) => event.data.teamIds),
                        ),
                    );
                    logger.info(
                        `[TeamAggregated -> Team] Purging memberships for ${teamIds.length} teams (from ${unprocessed.length} events)`,
                    );

                    const { affectedCount } =
                        await purgeTeamMembershipsByTeamIdsBatch(teamIds, trx);
                    logger.info(
                        `[TeamAggregated -> Team] Successfully deleted ${affectedCount} team membership records`,
                    );
                });
            },
        );
    }

    async handleSyncTeamTaskCount(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ): Promise<void> {
        return traceMethod(
            { ...CONTAINER, name: 'teamService.handleSyncTeamTaskCount' },
            async () => {
                if (events.length === 0) return;

                await db.transaction().execute(async (trx) => {
                    const unprocessed = await claimEventsAtomic(
                        trx,
                        events,
                        'team-task-count-group',
                    );
                    if (unprocessed.length === 0) return;

                    const updates = this.consolidateTeamDeltas(unprocessed);
                    logger.info(
                        `[TaskAggregated -> Team] Syncing task counts for ${updates.size} teams`,
                    );
                    await updateTeamTaskCountsBulk(updates, trx);
                });
            },
        );
    }

    private consolidateTeamDeltas(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ): Map<string, number> {
        const updates = new Map<string, number>();
        for (const event of events) {
            const { teamId, delta } = event.data;
            updates.set(teamId, (updates.get(teamId) ?? 0) + delta);
        }
        return updates;
    }

    private collectProjectIds(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): string[] {
        return Array.from(
            new Set(events.flatMap((event) => event.data.projectIds)),
        );
    }

    async init(): Promise<void> {
        logger.info(`TeamService initialized`);
    }

    async destroy(): Promise<void> {
        logger.info(`TeamService destroyed`);
    }
}
