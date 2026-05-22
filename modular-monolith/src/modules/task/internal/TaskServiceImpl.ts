import { db } from '../../../database/index.js';
import { logger } from '../../../logger/index.js';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../utils/event-bus/index.js';
import { appendEventsToOutbox } from '../../../utils/event-bus/OutboxQueries.ts';
import { syncActionRegistry } from '../../../utils/SyncActionRegistry.js';
import type {
    GetNeighbourhoodParam,
    GetTaskLinksParam,
    LinkConnection,
    PaginationParams,
    Task,
    TaskConnection,
    TaskContextRow,
    TaskLink,
    TaskNeighbourhoodResult,
    TaskReachabilityLinkChange,
    TaskService,
} from '../TaskService.ts';
import {
    BULK_DELETE_CHUNK_SIZE,
    contractTaskReachability,
    deleteProjectTaskLinksChunk,
    deleteProjectTaskReachabilityChunk,
    deleteProjectTasksChunk,
    deleteTask,
    deleteTaskLink,
    deleteTaskLinksByTaskIds,
    deleteTaskReachabilityChunk,
    expandTaskReachability,
    getNeighbourhood,
    getProjectTaskLinksPage,
    getTaskContextById as getTaskContextByIdQuery,
    getTaskLinksPage,
    getTasksByActorIdAndIds,
    getTasksByIds as getTasksByIdsQuery,
    getTasksPage,
    insertTask,
    insertTaskLink,
    orphanTasksByTeamIdsBatch,
    repairTaskReachabilityForProjects,
    syncTaskGraphCounters,
    unassignMembersFromTeamTasksBatch,
    unassignProjectTaskMembersBatch,
    updateTask,
    updateTaskLink,
} from './TaskQueries.ts';

export class TaskServiceImpl implements TaskService {
    async getTasks(
        userId: string,
        projectId: string | null,
        params: PaginationParams,
    ): Promise<TaskConnection> {
        logger.debug(
            `TaskService.getTasks called for user: ${userId}, project: ${projectId}`,
        );
        return getTasksPage(userId, projectId, params);
    }

    async getTasksByIds(ids: string[]): Promise<Task[]> {
        logger.debug(`TaskService.getTasksByIds called for ${ids.length} ids`);
        return await getTasksByIdsQuery(ids);
    }

    async getTasksByActorIdAndIds(
        actorId: string,
        ids: string[],
    ): Promise<Task[]> {
        logger.debug(
            `TaskService.getTasksByActorIdAndIds called for actor: ${actorId}, tasks: ${ids.length}`,
        );
        return await getTasksByActorIdAndIds(actorId, ids);
    }

    async getTaskContextById(
        taskId: string,
    ): Promise<TaskContextRow | undefined> {
        logger.debug(
            `TaskService.getTaskContextById called for task: ${taskId}`,
        );
        return getTaskContextByIdQuery(taskId);
    }

    async getTaskLinks(
        params: GetTaskLinksParam,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        logger.debug(
            `TaskService.getTaskLinks called for task: ${params.taskId}, direction: ${params.direction}, depthLimit: ${params.depthLimit ?? 'none'}`,
        );
        return await getTaskLinksPage(
            params.userId,
            params.projectId,
            params.taskId,
            params.direction,
            params.depthLimit,
            pagination,
        );
    }

    async getTaskNeighbourhood(
        params: GetNeighbourhoodParam,
    ): Promise<TaskNeighbourhoodResult> {
        logger.debug(
            `TaskService.getTaskNeighbourhood called for task: ${params.taskId}`,
        );
        return await getNeighbourhood(params);
    }

    async createTask(param: {
        actorId: string;
        projectId: string;
        title: string;
        description?: string | null;
        status?: string | null;
        priority?: number | null;
        traceId?: string | null;
    }): Promise<Task> {
        logger.info(
            `TaskService.createTask started by ${param.actorId} in project ${param.projectId} for "${param.title}" (Trace: ${param.traceId ?? 'none'})`,
        );
        if (param.title.length < 3 || param.title.length > 255) {
            throw new Error('Task title must be between 3 and 255 characters.');
        }
        const result = await insertTask(param);

        // SYNC ORCHESTRATION (ORCH-01)
        // Trigger synchronous auto-actions immediately in the request lifecycle.
        // The registry ensures decoupling while allowing side-effects to run before the response.
        await syncActionRegistry.executeHandlers('task.created', {
            type: KAFKA_EVENTS.TASK.CREATED,
            data: {
                taskId: result.id,
                projectId: result.projectId,
                teamId: result.teamId,
                memberId: result.memberId,
                title: result.title,
                actorId: param.actorId,
                traceId: param.traceId,
            },
        });

        logger.info(`TaskService.createTask successful: ${result.id}`);
        return result;
    }

    async updateTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
        version: number;
        title?: string | null;
        description?: string | null;
        status?: string | null;
        teamId?: string | null;
        memberId?: string | null;
        priority?: number | null;
        traceId?: string | null;
    }): Promise<Task> {
        logger.info(
            `TaskService.updateTask started for ${param.taskId} by ${param.actorId} (Trace: ${param.traceId ?? 'none'})`,
        );
        if (
            param.title &&
            (param.title.length < 3 || param.title.length > 255)
        ) {
            throw new Error('Task title must be between 3 and 255 characters.');
        }
        const result = await updateTask(param);

        // SYNC ORCHESTRATION (ORCH-01)
        // Passes both 'current' and 'old' (snapshot) state to allow transition-based predicates.
        await syncActionRegistry.executeHandlers('task.updated', {
            type: KAFKA_EVENTS.TASK.UPDATED,
            data: {
                taskId: result.id,
                projectId: result.projectId,
                teamId: result.teamId,
                memberId: result.memberId,
                title: result.title,
                status: result.status,
                actorId: param.actorId,
                traceId: param.traceId,
                old: {
                    teamId: (result as any).prev_team_id,
                    memberId: (result as any).prev_member_id,
                    title: (result as any).prev_title,
                    status: (result as any).prev_status,
                },
            },
        });

        logger.info(`TaskService.updateTask successful: ${param.taskId}`);
        return result;
    }

    async deleteTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
    }): Promise<string> {
        logger.info(
            `TaskService.deleteTask started for ${param.taskId} by ${param.actorId}`,
        );
        const result = await deleteTask(param);
        logger.info(`TaskService.deleteTask successful: ${param.taskId}`);
        return result;
    }

    async createTaskLink(param: {
        actorId: string;
        projectId: string;
        sourceTaskId: string;
        targetTaskId: string;
        label: string;
    }): Promise<TaskLink> {
        logger.info(
            `TaskService.createTaskLink started by ${param.actorId} between ${param.sourceTaskId} and ${param.targetTaskId}`,
        );
        const result = await insertTaskLink(param);
        logger.info(`TaskService.createTaskLink successful: ${result.id}`);
        return result;
    }

    async deleteTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
    }): Promise<string> {
        logger.info(
            `TaskService.deleteTaskLink started for ${param.linkId} by ${param.actorId}`,
        );
        const result = await deleteTaskLink(param);
        logger.info(`TaskService.deleteTaskLink successful: ${param.linkId}`);
        return result;
    }

    async updateTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
        sourceTaskId?: string | null;
        targetTaskId?: string | null;
        label?: string | null;
    }): Promise<TaskLink> {
        logger.info(
            `TaskService.updateTaskLink started for ${param.linkId} by ${param.actorId}`,
        );
        const result = await updateTaskLink(param);
        logger.info(`TaskService.updateTaskLink successful: ${param.linkId}`);
        return result;
    }

    async getProjectLinks(
        userId: string,
        projectId: string,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        logger.debug(
            `TaskService.getProjectLinks called for project: ${projectId}`,
        );
        return await getProjectTaskLinksPage(userId, projectId, pagination);
    }

    async handleTaskReachabilitySync(
        events: DomainEvent<{
            projectId: string;
            links: TaskReachabilityLinkChange[];
        }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        logger.info(
            `[Graph Engine] Processing batched signals: ${events.length} projects`,
        );

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-reachability-sync-group',
            );

            if (unprocessed.length === 0) return;

            for (const event of unprocessed) {
                const { projectId, links } = event.data;

                if (!links || !Array.isArray(links)) {
                    logger.warn(
                        `[Graph Engine] Received reachability signal without links for project ${projectId}`,
                    );
                    continue;
                }

                logger.info(
                    `[Graph Engine] Applying ${links.length} reachability updates for project ${projectId}`,
                );

                for (const link of links) {
                    if (link.action === 'ADD') {
                        await expandTaskReachability(
                            trx,
                            projectId,
                            link.sourceTaskId,
                            link.targetTaskId,
                        );
                    } else if (link.action === 'REMOVE') {
                        await contractTaskReachability(
                            trx,
                            projectId,
                            link.sourceTaskId,
                            link.targetTaskId,
                        );
                    }
                }

                await syncTaskGraphCounters(trx, projectId);
            }
        });
    }

    async handleDeleteTaskLinks(
        events: DomainEvent<{ taskIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-link-cleanup-group',
            );

            if (unprocessed.length === 0) return;

            const taskIds = this.collectTaskIds(unprocessed);

            logger.info(
                `[TaskAggregated -> Task] Purging links for ${taskIds.length} tasks (from ${unprocessed.length} events)`,
            );

            await deleteTaskLinksByTaskIds(taskIds, trx);
        });
    }

    async handleDeleteTaskReachability(
        events: DomainEvent<{ taskIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-bulk-reachability-group',
            );

            if (unprocessed.length === 0) return;

            const taskIds = this.collectTaskIds(unprocessed);

            logger.info(
                `[Graph Engine] Purging reachability chunk for ${taskIds.length} tasks`,
            );

            const { affectedCount, affectedProjectIds } =
                await deleteTaskReachabilityChunk(trx, taskIds);

            logger.info(
                `[Graph Engine] Purged ${affectedCount} reachability rows across ${affectedProjectIds.length} projects`,
            );

            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                logger.info(
                    '[Graph Engine] Chunk full — deferring repair, emitting continuation signal',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.TASK_AGGREGATED
                                .DELETE_TASK_REACHABILITY_CHUNK,
                            taskIds,
                        },
                    },
                ]);
            } else if (affectedProjectIds.length > 0) {
                logger.info(
                    `[Graph Engine] Final chunk complete — repairing closure for ${affectedProjectIds.length} projects`,
                );
                await repairTaskReachabilityForProjects(
                    trx,
                    affectedProjectIds,
                );
            }
        });
    }

    async handleUnassignProjectTaskMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-member-unassignment-group',
            );

            if (unprocessed.length === 0) return;

            const deltas = this.consolidateProjectUserDeltas(unprocessed);

            logger.info(
                `[ProjectAggregated -> Task] Executing batch unassignment of task members for ${deltas.length} projects (from ${unprocessed.length} events)`,
            );

            const { affectedCount } = await unassignProjectTaskMembersBatch(
                deltas,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Successfully unassigned members from ${affectedCount} tasks across ${deltas.length} projects`,
            );
        });
    }

    async handleDeleteProjectTask(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-decommissioning-group',
            );

            if (unprocessed.length === 0) return;

            const projectIds = this.collectProjectIds(unprocessed);
            const { affectedCount } = await deleteProjectTasksChunk(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Deleted chunk of ${affectedCount} tasks for ${projectIds.length} projects`,
            );

            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                logger.info(
                    '[ProjectAggregated -> Task] Chunk full — emitting continuation signal',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.PROJECT_AGGREGATED
                                .DELETE_PROJECT_TASK_CHUNK,
                            projectIds,
                        },
                    },
                ]);
            }
        });
    }

    async handleDeleteProjectTaskLink(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-link-decommissioning-group',
            );

            if (unprocessed.length === 0) return;

            const projectIds = this.collectProjectIds(unprocessed);
            const { affectedCount } = await deleteProjectTaskLinksChunk(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Deleted chunk of ${affectedCount} task links for ${projectIds.length} projects`,
            );

            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                logger.info(
                    '[ProjectAggregated -> Task] Chunk full — emitting continuation signal for task links',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.PROJECT_AGGREGATED
                                .DELETE_PROJECT_TASK_LINK_CHUNK,
                            projectIds,
                        },
                    },
                ]);
            }
        });
    }

    async handleDeleteProjectReachability(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-project-reachability-purge-group',
            );

            if (unprocessed.length === 0) return;

            const projectIds = this.collectProjectIds(unprocessed);
            const { affectedCount } = await deleteProjectTaskReachabilityChunk(
                projectIds,
                trx,
            );

            logger.info(
                `[Graph Engine] Purged chunk of ${affectedCount} reachability rows for ${projectIds.length} projects`,
            );

            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                logger.info(
                    '[Graph Engine] Chunk full — emitting continuation signal for reachability purge',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.PROJECT_AGGREGATED
                                .DELETE_PROJECT_TASK_REACHABILITY_CHUNK,
                            projectIds,
                        },
                    },
                ]);
            }
        });
    }

    async handleOrphanTeamTasks(
        events: DomainEvent<{ teamIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-task-orphaning-group',
            );

            if (unprocessed.length === 0) return;

            const teamIds = this.collectTeamIds(unprocessed);

            logger.info(
                `[TeamAggregated -> Task] Orphaning tasks for ${teamIds.length} teams (from ${unprocessed.length} events)`,
            );

            const { affectedCount } = await orphanTasksByTeamIdsBatch(
                teamIds,
                trx,
            );

            logger.info(
                `[TeamAggregated -> Task] Successfully orphaned ${affectedCount} tasks`,
            );
        });
    }

    async handleUnassignMemberFromTeamTasks(
        events: DomainEvent<{ teamId: string; userIds: string[] }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-task-unassignment-group',
            );

            if (unprocessed.length === 0) return;

            const deltas = this.consolidateTeamUserDeltas(unprocessed);
            for (const { teamId, userIds } of deltas) {
                logger.info(
                    `[TeamAggregated -> Task] Unassigning ${userIds.length} users from tasks in team ${teamId}`,
                );

                await unassignMembersFromTeamTasksBatch(teamId, userIds, trx);
            }
        });
    }

    private collectTaskIds(
        events: DomainEvent<{ taskIds: string[] }>[],
    ): string[] {
        return Array.from(
            new Set(events.flatMap((event) => event.data.taskIds)),
        );
    }

    private collectProjectIds(
        events: DomainEvent<{ projectIds: string[] }>[],
    ): string[] {
        return Array.from(
            new Set(events.flatMap((event) => event.data.projectIds)),
        );
    }

    private collectTeamIds(
        events: DomainEvent<{ teamIds: string[] }>[],
    ): string[] {
        return Array.from(
            new Set(events.flatMap((event) => event.data.teamIds)),
        );
    }

    private consolidateProjectUserDeltas(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ): { projectId: string; userIds: string[] }[] {
        const projectMap = new Map<string, Set<string>>();
        for (const event of events) {
            const { projectId, userIds } = event.data;
            const existing = projectMap.get(projectId) ?? new Set<string>();
            userIds.forEach((id: string) => existing.add(id));
            projectMap.set(projectId, existing);
        }

        return Array.from(projectMap.entries()).map(
            ([projectId, userIdsSet]) => ({
                projectId,
                userIds: Array.from(userIdsSet),
            }),
        );
    }

    private consolidateTeamUserDeltas(
        events: DomainEvent<{ teamId: string; userIds: string[] }>[],
    ): { teamId: string; userIds: string[] }[] {
        const teamMap = new Map<string, Set<string>>();
        for (const event of events) {
            const { teamId, userIds } = event.data;
            const existing = teamMap.get(teamId) ?? new Set<string>();
            userIds.forEach((id: string) => existing.add(id));
            teamMap.set(teamId, existing);
        }

        return Array.from(teamMap.entries()).map(([teamId, userIdsSet]) => ({
            teamId,
            userIds: Array.from(userIdsSet),
        }));
    }

    async init(): Promise<void> {
        logger.info(`TaskService initialized`);
    }

    async destroy(): Promise<void> {
        logger.info(`TaskService destroyed`);
    }
}
