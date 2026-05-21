import { db } from '../../../database';
import { logger } from '../../../logger';
import type { DomainEvent } from '../../../utils/event-bus';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';
import { appendEventsToOutbox } from '../../../utils/event-bus/OutboxQueries.ts';
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
    repairTaskReachabilityForProjects,
    syncTaskGraphCounters,
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

    private collectTaskIds(
        events: DomainEvent<{ taskIds: string[] }>[],
    ): string[] {
        return Array.from(
            new Set(events.flatMap((event) => event.data.taskIds)),
        );
    }

    async init(): Promise<void> {
        logger.info(`TaskService initialized`);
    }

    async destroy(): Promise<void> {
        logger.info(`TaskService destroyed`);
    }
}
