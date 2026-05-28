import { sql } from 'kysely';
import { db } from '../../../infra/database/index.ts';
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from '../../../infra/graphql/errors.ts';
import { logger } from '../../../infra/logger/index.ts';
import { traceMethod } from '../../../infra/tracing.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../infra/utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../infra/utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../infra/utils/event-bus/index.js';
import { appendEventsToOutbox } from '../../../infra/utils/event-bus/OutboxQueries.ts';
import { syncActionRegistry } from '../../../infra/utils/SyncActionRegistry.ts';
import type {
    CreateTaskAutomationRuleInput,
    GetNeighbourhoodParam,
    GetTaskLinksParam,
    LinkConnection,
    PaginationParams,
    RiskLevel,
    SimulatedSlip,
    Task,
    TaskActivityLogConnection,
    TaskAutomationRule,
    TaskComment,
    TaskCommentConnection,
    TaskConnection,
    TaskContextRow,
    TaskLink,
    TaskNeighbourhoodResult,
    TaskReachabilityLinkChange,
    TaskService,
    UpdateTaskAutomationRuleInput,
} from '../TaskService.ts';
import {
    AUTOMATION_ACTIONS,
    AUTOMATION_CONDITIONS,
    isAutomationActionType,
    isAutomationConditionType,
    isAutomationTrigger,
} from './AutomationRegistry.ts';
import {
    BULK_DELETE_CHUNK_SIZE,
    contractTaskReachability,
    deleteComment as deleteCommentQuery,
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
    getTaskActivityLogsPage,
    getTaskCommentsPage,
    getTaskContextById as getTaskContextByIdQuery,
    getTaskLinksPage,
    getTasksByActorIdAndIds,
    getTasksByIds as getTasksByIdsQuery,
    getTasksPage,
    insertComment as insertCommentQuery,
    insertTask,
    insertTaskLink,
    orphanTasksByTeamIdsBatch,
    repairTaskReachabilityForProjects,
    syncTaskGraphCounters,
    unassignMembersFromTeamTasksBatch,
    unassignProjectTaskMembersBatch,
    updateComment as updateCommentQuery,
    updateTask,
    updateTaskLink,
} from './TaskQueries.ts';

const CONTAINER = {
    containerId: 'task-module',
    containerName: 'Task Module',
    containerType: 'Logical Domain Module',
} as const;

export class TaskServiceImpl implements TaskService {
    async getTasks(
        userId: string,
        projectId: string | null,
        params: PaginationParams,
    ): Promise<TaskConnection> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTasks' },
            async () => {
                logger.debug(
                    `TaskService.getTasks called for user: ${userId}, project: ${projectId}`,
                );
                return getTasksPage(userId, projectId, params);
            },
        );
    }

    async getTasksByIds(ids: string[]): Promise<Task[]> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTasksByIds' },
            async () => {
                logger.debug(
                    `TaskService.getTasksByIds called for ${ids.length} ids`,
                );
                return await getTasksByIdsQuery(ids);
            },
        );
    }

    async getTasksByActorIdAndIds(
        actorId: string,
        ids: string[],
    ): Promise<Task[]> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTasksByActorIdAndIds' },
            async () => {
                logger.debug(
                    `TaskService.getTasksByActorIdAndIds called for actor: ${actorId}, tasks: ${ids.length}`,
                );
                return await getTasksByActorIdAndIds(actorId, ids);
            },
        );
    }

    async getTaskContextById(
        taskId: string,
    ): Promise<TaskContextRow | undefined> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTaskContextById' },
            async () => {
                logger.debug(
                    `TaskService.getTaskContextById called for task: ${taskId}`,
                );
                return getTaskContextByIdQuery(taskId);
            },
        );
    }

    async getTaskLinks(
        params: GetTaskLinksParam,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTaskLinks' },
            async () => {
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
            },
        );
    }

    async getTaskNeighbourhood(
        params: GetNeighbourhoodParam,
    ): Promise<TaskNeighbourhoodResult> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTaskNeighbourhood' },
            async () => {
                logger.debug(
                    `TaskService.getTaskNeighbourhood called for task: ${params.taskId}`,
                );
                return await getNeighbourhood(params);
            },
        );
    }

    async getAutomationRulesForProject(
        userId: string,
        projectId: string,
    ): Promise<TaskAutomationRule[]> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getAutomationRulesForProject' },
            async () => {
                await this.ensureAutomationProjectAccess(userId, projectId);
                const rules = await db
                    .selectFrom('task_automation_rule')
                    .selectAll()
                    .where('fk_project_id', '=', projectId)
                    .orderBy('created_at', 'asc')
                    .execute();
                return rules.map((rule) => this.mapAutomationRule(rule));
            },
        );
    }

    async createTask(param: {
        actorId: string;
        projectId: string;
        title: string;
        description?: string | null;
        status?: string | null;
        priority?: number | null;
        dueDate?: string | null;
        traceId?: string | null;
    }): Promise<Task> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.createTask' },
            async () => {
                logger.info(
                    `TaskService.createTask started by ${param.actorId} in project ${param.projectId} for "${param.title}" (Trace: ${param.traceId ?? 'none'})`,
                );
                if (param.title.length < 3 || param.title.length > 255) {
                    throw new Error(
                        'Task title must be between 3 and 255 characters.',
                    );
                }
                const result = await insertTask(param);

                // SYNC ORCHESTRATION (ORCH-01)
                // Trigger synchronous auto-actions immediately in the request lifecycle.
                // The registry ensures decoupling while allowing side-effects to run before the response.
                await syncActionRegistry.executeHandlers('task.created', {
                    type: EVENT_TYPES.TASK.CREATED,
                    data: {
                        taskId: result.id,
                        projectId: result.projectId,
                        teamId: result.teamId,
                        memberId: result.memberId,
                        title: result.title,
                        status: result.status,
                        priority: result.priority,
                        dueDate: result.dueDate
                            ? result.dueDate.toISOString()
                            : null,
                        actorId: param.actorId,
                        traceId: param.traceId,
                    },
                });

                logger.info(`TaskService.createTask successful: ${result.id}`);
                return result;
            },
        );
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
        dueDate?: string | null;
        traceId?: string | null;
    }): Promise<Task> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.updateTask' },
            async () => {
                logger.info(
                    `TaskService.updateTask started for ${param.taskId} by ${param.actorId} (Trace: ${param.traceId ?? 'none'})`,
                );
                if (
                    param.title &&
                    (param.title.length < 3 || param.title.length > 255)
                ) {
                    throw new Error(
                        'Task title must be between 3 and 255 characters.',
                    );
                }

                await this.runSyncAutomationRules(param);

                const result = await updateTask(param);

                // SYNC ORCHESTRATION (ORCH-01)
                // Passes both 'current' and 'old' (snapshot) state to allow transition-based predicates.
                await syncActionRegistry.executeHandlers('task.updated', {
                    type: EVENT_TYPES.TASK.UPDATED,
                    data: {
                        taskId: result.id,
                        projectId: result.projectId,
                        teamId: result.teamId,
                        memberId: result.memberId,
                        title: result.title,
                        status: result.status,
                        priority: result.priority,
                        dueDate: result.dueDate
                            ? result.dueDate.toISOString()
                            : null,
                        actorId: param.actorId,
                        traceId: param.traceId,
                        old: {
                            teamId: (result as any).prev_team_id,
                            memberId: (result as any).prev_member_id,
                            title: (result as any).prev_title,
                            status: (result as any).prev_status,
                            priority: (result as any).prev_priority,
                            dueDate: (result as any).prev_due_date,
                        },
                    },
                });

                logger.info(
                    `TaskService.updateTask successful: ${param.taskId}`,
                );
                return result;
            },
        );
    }

    async createAutomationRule(
        actorId: string,
        input: CreateTaskAutomationRuleInput,
    ): Promise<TaskAutomationRule> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.createAutomationRule' },
            async () => {
                await this.ensureAutomationProjectAccess(
                    actorId,
                    input.projectId,
                );
                this.validateAutomationRuleInput(input);

                const rows = await db
                    .insertInto('task_automation_rule')
                    .values({
                        fk_project_id: input.projectId,
                        name: input.name,
                        is_active: input.isActive ?? true,
                        is_sync: input.isSync ?? false,
                        trigger_type: input.triggerType,
                        trigger_value: input.triggerValue ?? null,
                        condition_type: input.conditionType,
                        condition_value: input.conditionValue ?? null,
                        action_type: input.actionType,
                        action_value: input.actionValue ?? null,
                    })
                    .returningAll()
                    .execute();

                const rule = rows[0];
                if (!rule)
                    throw new ValidationError(
                        'Unable to create automation rule.',
                    );

                return this.mapAutomationRule(rule);
            },
        );
    }

    async updateAutomationRule(
        actorId: string,
        input: UpdateTaskAutomationRuleInput,
    ): Promise<TaskAutomationRule> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.updateAutomationRule' },
            async () => {
                await this.ensureAutomationProjectAccess(
                    actorId,
                    input.projectId,
                );
                this.validateAutomationRuleInput(input);

                const updates: Record<string, unknown> = {
                    version: sql`version + 1`,
                    updated_at: sql`CURRENT_TIMESTAMP`,
                };

                if (input.name !== undefined) {
                    if (input.name === null || input.name.trim().length === 0) {
                        throw new ValidationError(
                            'Automation rule name is required.',
                        );
                    }
                    updates.name = input.name;
                }
                if (input.isActive !== undefined) {
                    if (input.isActive === null) {
                        throw new ValidationError('isActive cannot be null.');
                    }
                    updates.is_active = input.isActive;
                }
                if (input.isSync !== undefined) {
                    if (input.isSync === null) {
                        throw new ValidationError('isSync cannot be null.');
                    }
                    updates.is_sync = input.isSync;
                }
                if (input.triggerType !== undefined)
                    updates.trigger_type = input.triggerType;
                if (input.triggerValue !== undefined)
                    updates.trigger_value = input.triggerValue;
                if (input.conditionType !== undefined)
                    updates.condition_type = input.conditionType;
                if (input.conditionValue !== undefined)
                    updates.condition_value = input.conditionValue;
                if (input.actionType !== undefined)
                    updates.action_type = input.actionType;
                if (input.actionValue !== undefined)
                    updates.action_value = input.actionValue;

                const rows = await db
                    .updateTable('task_automation_rule')
                    .set(updates as any)
                    .where('id', '=', input.ruleId)
                    .where('fk_project_id', '=', input.projectId)
                    .where('version', '=', input.version)
                    .returningAll()
                    .execute();

                const rule = rows[0];
                if (!rule) {
                    const existing = await db
                        .selectFrom('task_automation_rule')
                        .select(['id', 'version'])
                        .where('id', '=', input.ruleId)
                        .where('fk_project_id', '=', input.projectId)
                        .executeTakeFirst();

                    if (!existing) {
                        throw new NotFoundError(
                            `Automation rule ${input.ruleId} not found.`,
                        );
                    }

                    throw new ConflictError(
                        `Automation rule version mismatch. Expected ${input.version}, but current version is ${existing.version}.`,
                    );
                }

                return this.mapAutomationRule(rule);
            },
        );
    }

    async deleteAutomationRule(
        actorId: string,
        projectId: string,
        ruleId: string,
    ): Promise<boolean> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.deleteAutomationRule' },
            async () => {
                await this.ensureAutomationProjectAccess(actorId, projectId);

                const result = await db
                    .deleteFrom('task_automation_rule')
                    .where('id', '=', ruleId)
                    .where('fk_project_id', '=', projectId)
                    .returning('id')
                    .executeTakeFirst();

                return !!result;
            },
        );
    }

    async deleteTask(param: {
        actorId: string;
        projectId: string;
        taskId: string;
    }): Promise<string> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.deleteTask' },
            async () => {
                logger.info(
                    `TaskService.deleteTask started for ${param.taskId} by ${param.actorId}`,
                );
                const result = await deleteTask(param);

                await syncActionRegistry.executeHandlers('task.deleted', {
                    type: EVENT_TYPES.TASK.DELETED,
                    data: {
                        taskId: param.taskId,
                        projectId: param.projectId,
                        actorId: param.actorId,
                    },
                });

                logger.info(
                    `TaskService.deleteTask successful: ${param.taskId}`,
                );
                return result;
            },
        );
    }

    async createTaskLink(param: {
        actorId: string;
        projectId: string;
        sourceTaskId: string;
        targetTaskId: string;
        label: string;
    }): Promise<TaskLink> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.createTaskLink' },
            async () => {
                logger.info(
                    `TaskService.createTaskLink started by ${param.actorId} between ${param.sourceTaskId} and ${param.targetTaskId}`,
                );
                const result = await insertTaskLink(param);
                logger.info(
                    `TaskService.createTaskLink successful: ${result.id}`,
                );
                return result;
            },
        );
    }

    async deleteTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
    }): Promise<string> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.deleteTaskLink' },
            async () => {
                logger.info(
                    `TaskService.deleteTaskLink started for ${param.linkId} by ${param.actorId}`,
                );
                const result = await deleteTaskLink(param);
                logger.info(
                    `TaskService.deleteTaskLink successful: ${param.linkId}`,
                );
                return result;
            },
        );
    }

    async updateTaskLink(param: {
        actorId: string;
        projectId: string;
        linkId: string;
        sourceTaskId?: string | null;
        targetTaskId?: string | null;
        label?: string | null;
    }): Promise<TaskLink> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.updateTaskLink' },
            async () => {
                logger.info(
                    `TaskService.updateTaskLink started for ${param.linkId} by ${param.actorId}`,
                );
                const result = await updateTaskLink(param);
                logger.info(
                    `TaskService.updateTaskLink successful: ${param.linkId}`,
                );
                return result;
            },
        );
    }

    async getProjectLinks(
        userId: string,
        projectId: string,
        pagination: PaginationParams,
    ): Promise<LinkConnection> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getProjectLinks' },
            async () => {
                logger.debug(
                    `TaskService.getProjectLinks called for project: ${projectId}`,
                );
                return await getProjectTaskLinksPage(
                    userId,
                    projectId,
                    pagination,
                );
            },
        );
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
                        stream: EVENT_STREAMS.TASK_AGGREGATED,
                        payload: {
                            type: EVENT_TYPES.TASK_AGGREGATED
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
                        stream: EVENT_STREAMS.PROJECT_AGGREGATED,
                        payload: {
                            type: EVENT_TYPES.PROJECT_AGGREGATED
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
                        stream: EVENT_STREAMS.PROJECT_AGGREGATED,
                        payload: {
                            type: EVENT_TYPES.PROJECT_AGGREGATED
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
                        stream: EVENT_STREAMS.PROJECT_AGGREGATED,
                        payload: {
                            type: EVENT_TYPES.PROJECT_AGGREGATED
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

    private async runSyncAutomationRules(param: {
        actorId: string;
        projectId: string;
        taskId: string;
        version: number;
        status?: string | null;
        teamId?: string | null;
        memberId?: string | null;
        priority?: number | null;
    }): Promise<void> {
        const [currentTask] = await getTasksByActorIdAndIds(param.actorId, [
            param.taskId,
        ]);

        if (
            !currentTask ||
            currentTask.projectId !== param.projectId ||
            currentTask.version !== param.version
        ) {
            return;
        }

        const isStatusChanging =
            param.status !== undefined && param.status !== currentTask.status;
        const isPriorityChanging =
            param.priority !== undefined &&
            param.priority !== currentTask.priority;
        const isAssigneeChanging =
            (param.memberId !== undefined &&
                param.memberId !== currentTask.memberId) ||
            (param.teamId !== undefined && param.teamId !== currentTask.teamId);

        if (!isStatusChanging && !isPriorityChanging && !isAssigneeChanging) {
            return;
        }

        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', param.projectId)
            .where('trigger_type', 'in', [
                'STATUS_CHANGED',
                'PRIORITY_CHANGED',
                'ASSIGNEE_CHANGED',
            ])
            .where('is_active', '=', true)
            .where('is_sync', '=', true)
            .execute();

        for (const rule of rules) {
            let matches = true;

            if (rule.trigger_type === 'STATUS_CHANGED') {
                if (!isStatusChanging) continue;
                const targetStatus = param.status ?? 'TODO';
                if (rule.trigger_value) {
                    try {
                        const cfg = JSON.parse(rule.trigger_value);
                        if (cfg.from && cfg.from !== currentTask.status)
                            matches = false;
                        if (cfg.to && cfg.to !== targetStatus) matches = false;
                    } catch (e) {
                        if (rule.trigger_value !== targetStatus)
                            matches = false;
                    }
                }
            } else if (rule.trigger_type === 'PRIORITY_CHANGED') {
                if (!isPriorityChanging) continue;
                const targetPriority = param.priority ?? 0;
                if (rule.trigger_value) {
                    try {
                        const cfg = JSON.parse(rule.trigger_value);
                        if (
                            cfg.from &&
                            Number(cfg.from) !== currentTask.priority
                        )
                            matches = false;
                        if (cfg.to && Number(cfg.to) !== targetPriority)
                            matches = false;
                    } catch (e) {
                        if (Number(rule.trigger_value) !== targetPriority)
                            matches = false;
                    }
                }
            } else if (rule.trigger_type === 'ASSIGNEE_CHANGED') {
                if (!isAssigneeChanging) continue;
            } else {
                continue;
            }

            if (!matches) continue;

            const conditionFn =
                AUTOMATION_CONDITIONS[
                    rule.condition_type as keyof typeof AUTOMATION_CONDITIONS
                ];
            const actionFn =
                AUTOMATION_ACTIONS[
                    rule.action_type as keyof typeof AUTOMATION_ACTIONS
                ];

            if (!conditionFn || !actionFn) continue;

            const validationTask: Task = {
                ...currentTask,
                memberId:
                    param.memberId !== undefined
                        ? param.memberId
                        : currentTask.memberId,
                teamId:
                    param.teamId !== undefined
                        ? param.teamId
                        : currentTask.teamId,
            };

            const isMet = await conditionFn(
                validationTask,
                rule.condition_value,
            );
            if (!isMet) continue;

            await actionFn(currentTask, rule.action_value, {
                actorId: param.actorId,
                isSync: true,
                taskService: this,
            });
        }
    }

    private async ensureAutomationProjectAccess(
        actorId: string,
        projectId: string,
    ): Promise<void> {
        const result = await sql<{ hasAccess: boolean }>`
            SELECT EXISTS (
                SELECT 1
                FROM project p
                WHERE p.id = ${projectId}::uuid
                  AND (
                      p.fk_user_id = ${actorId}::text
                      OR EXISTS (
                          SELECT 1
                          FROM project_member pm
                          WHERE pm.fk_project_id = p.id
                            AND pm.fk_user_id = ${actorId}::text
                      )
                      OR ${actorId}::text LIKE 'system:%'
                  )
            ) AS "hasAccess"
        `.execute(db);

        if (!result.rows[0]?.hasAccess) {
            throw new NotFoundError(
                `Project ${projectId} not found or unauthorized.`,
            );
        }
    }

    private validateAutomationRuleInput(
        input: CreateTaskAutomationRuleInput | UpdateTaskAutomationRuleInput,
    ): void {
        const isCreate = !('ruleId' in input);

        if (isCreate && (!input.name || input.name.trim().length === 0)) {
            throw new ValidationError('Automation rule name is required.');
        }

        if (
            (isCreate || input.triggerType !== undefined) &&
            (!input.triggerType || !isAutomationTrigger(input.triggerType))
        ) {
            throw new ValidationError(
                `Unsupported automation trigger: ${input.triggerType ?? 'missing'}.`,
            );
        }

        if (
            (isCreate || input.conditionType !== undefined) &&
            (!input.conditionType ||
                !isAutomationConditionType(input.conditionType))
        ) {
            throw new ValidationError(
                `Unsupported automation condition: ${input.conditionType ?? 'missing'}.`,
            );
        }

        if (
            (isCreate || input.actionType !== undefined) &&
            (!input.actionType || !isAutomationActionType(input.actionType))
        ) {
            throw new ValidationError(
                `Unsupported automation action: ${input.actionType ?? 'missing'}.`,
            );
        }
    }

    private mapAutomationRule(row: {
        id: string;
        fk_project_id: string;
        name: string;
        is_active: boolean;
        is_sync: boolean;
        trigger_type: string;
        trigger_value: string | null;
        condition_type: string;
        condition_value: string | null;
        action_type: string;
        action_value: string | null;
        version: number;
        created_at: Date;
        updated_at: Date;
    }): TaskAutomationRule {
        return {
            id: row.id,
            projectId: row.fk_project_id,
            name: row.name,
            isActive: row.is_active,
            isSync: row.is_sync,
            triggerType: row.trigger_type,
            triggerValue: row.trigger_value,
            conditionType: row.condition_type,
            conditionValue: row.condition_value,
            actionType: row.action_type,
            actionValue: row.action_value,
            version: row.version,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
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

    async simulateSlippage(
        userId: string,
        projectId: string,
        taskId: string,
        delayDays: number,
    ): Promise<SimulatedSlip[]> {
        // 1. Authorize: check if user has access to the project
        const member = await db
            .selectFrom('project_member')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .where('fk_user_id', '=', userId)
            .executeTakeFirst();

        const project = await db
            .selectFrom('project')
            .select('fk_user_id')
            .where('id', '=', projectId)
            .executeTakeFirst();

        const isCreator = project?.fk_user_id === userId;
        if (!member && !isCreator) {
            throw new ValidationError(
                'Actor does not have permission to access this project',
            );
        }

        // 2. Fetch target task
        const task = await db
            .selectFrom('project_task')
            .select(['id', 'title', 'due_date as dueDate'])
            .where('id', '=', taskId)
            .where('fk_project_id', '=', projectId)
            .executeTakeFirst();

        if (!task) {
            throw new NotFoundError(
                `Task with ID ${taskId} not found in project ${projectId}`,
            );
        }

        // If target task doesn't have a due_date, default to today's date to allow simulation
        const originDate = task.dueDate ? new Date(task.dueDate) : new Date();

        // 3. Fetch unique descendants of task
        const descendants = await db
            .selectFrom('task_reachability')
            .innerJoin(
                'project_task',
                'project_task.id',
                'task_reachability.descendant_task_id',
            )
            .select([
                'project_task.id',
                'project_task.title',
                'project_task.due_date as dueDate',
            ])
            .where('task_reachability.ancestor_task_id', '=', taskId)
            .where('task_reachability.fk_project_id', '=', projectId)
            .where('task_reachability.depth', '>', 0)
            .distinct()
            .execute();

        const results: SimulatedSlip[] = [];

        // 4. Calculate for slipped task itself
        const selfSimulatedDueDate = new Date(
            originDate.getTime() + delayDays * 24 * 60 * 60 * 1000,
        );
        results.push({
            taskId: task.id,
            title: task.title,
            originalDueDate: task.dueDate ? new Date(task.dueDate) : null,
            simulatedDueDate: selfSimulatedDueDate,
            slipDays: delayDays,
            riskLevel: delayDays > 0 ? 'HIGH' : 'LOW',
            bufferRemainingDays: 0,
        });

        // 5. Calculate for each descendant
        for (const desc of descendants) {
            const descOrigDate = desc.dueDate ? new Date(desc.dueDate) : null;
            let simulatedDueDate: Date | null = null;
            let slipDays = 0;
            let riskLevel: RiskLevel = 'LOW';
            let bufferRemainingDays = 999; // Default infinite buffer if no dates

            if (descOrigDate) {
                // Calculate Slack = descOrigDate - originDate
                const slackMs = descOrigDate.getTime() - originDate.getTime();
                const slackDays = Math.max(
                    0,
                    Math.floor(slackMs / (24 * 60 * 60 * 1000)),
                );

                // Calculate Delay = max(0, delayDays - slackDays)
                slipDays = Math.max(0, delayDays - slackDays);
                simulatedDueDate = new Date(
                    descOrigDate.getTime() + slipDays * 24 * 60 * 60 * 1000,
                );
                bufferRemainingDays = Math.max(0, slackDays - delayDays);

                if (slipDays > 0) {
                    riskLevel = 'HIGH';
                } else if (delayDays >= 0.8 * slackDays) {
                    riskLevel = 'MEDIUM';
                } else {
                    riskLevel = 'LOW';
                }
            }

            results.push({
                taskId: desc.id,
                title: desc.title,
                originalDueDate: descOrigDate,
                simulatedDueDate: simulatedDueDate,
                slipDays,
                riskLevel,
                bufferRemainingDays,
            });
        }

        return results;
    }

    async getTaskComments(
        userId: string,
        taskId: string,
        pagination: PaginationParams,
    ): Promise<TaskCommentConnection> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTaskComments' },
            async () => {
                logger.debug(
                    `TaskService.getTaskComments called for task ${taskId} by user ${userId}`,
                );
                return await getTaskCommentsPage(userId, taskId, pagination);
            },
        );
    }

    async getTaskActivityLogs(
        userId: string,
        taskId: string,
        pagination: PaginationParams,
    ): Promise<TaskActivityLogConnection> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.getTaskActivityLogs' },
            async () => {
                logger.debug(
                    `TaskService.getTaskActivityLogs called for task ${taskId} by user ${userId}`,
                );
                return await getTaskActivityLogsPage(
                    userId,
                    taskId,
                    pagination,
                );
            },
        );
    }

    async addComment(
        userId: string,
        taskId: string,
        content: string,
    ): Promise<TaskComment> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.addComment' },
            async () => {
                logger.info(
                    `TaskService.addComment started for task ${taskId} by user ${userId}`,
                );
                if (!content || content.trim().length === 0) {
                    throw new ValidationError(
                        'Comment content cannot be empty.',
                    );
                }
                if (content.length > 2000) {
                    throw new ValidationError(
                        'Comment content cannot exceed 2000 characters.',
                    );
                }
                const result = await insertCommentQuery(
                    userId,
                    taskId,
                    content.trim(),
                );
                logger.info(`TaskService.addComment successful: ${result.id}`);
                return result;
            },
        );
    }

    async updateComment(
        userId: string,
        commentId: string,
        content: string,
        version: number,
    ): Promise<TaskComment> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.updateComment' },
            async () => {
                logger.info(
                    `TaskService.updateComment started for comment ${commentId} by user ${userId}`,
                );
                if (!content || content.trim().length === 0) {
                    throw new ValidationError(
                        'Comment content cannot be empty.',
                    );
                }
                if (content.length > 2000) {
                    throw new ValidationError(
                        'Comment content cannot exceed 2000 characters.',
                    );
                }
                const result = await updateCommentQuery(
                    userId,
                    commentId,
                    content.trim(),
                    version,
                );
                logger.info(
                    `TaskService.updateComment successful: ${result.id}`,
                );
                return result;
            },
        );
    }

    async deleteComment(userId: string, commentId: string): Promise<string> {
        return traceMethod(
            { ...CONTAINER, name: 'taskService.deleteComment' },
            async () => {
                logger.info(
                    `TaskService.deleteComment started for comment ${commentId} by user ${userId}`,
                );
                const result = await deleteCommentQuery(userId, commentId);
                logger.info(`TaskService.deleteComment successful: ${result}`);
                return result;
            },
        );
    }

    async init(): Promise<void> {
        logger.info(`TaskService initialized`);
    }

    async destroy(): Promise<void> {
        logger.info(`TaskService destroyed`);
    }
}
