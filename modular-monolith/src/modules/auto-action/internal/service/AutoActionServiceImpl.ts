import { db } from '../../../../database/index.js';
import type {
    AutoAction,
    AutoActionUpdate,
    NewAutoAction,
} from '../../../../database/tables/AutoAction.js';
import { logger } from '../../../../logger/index.js';
import type { PaginationParams } from '../../../../types/pagination.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/index.js';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.js';
import { encodeCursor } from '../../../../utils/utils.ts';
import { projectService } from '../../../project/index.js';
import type {
    AutoActionConnection,
    AutoActionService,
    CreateAutoActionForActorInput,
    UpdateAutoActionForActorInput,
} from '../../AutoActionService.js';
import {
    autoActionFlowSchema,
    EntityScope,
    type ScopeTemplate,
} from '../../types.js';
import { executeAutoActionPipeline } from '../execution/executor.js';
import { getTemplateForScope } from '../execution/template.js';
import {
    deleteAutoActionById,
    insertAutoAction,
    isEventProcessed,
    markEventProcessed,
    selectActiveAutoActionByName,
    selectActiveAutoActionsForProject,
    selectAutoActionById,
    selectAutoActionsByIds,
    selectAutoActionsForProject,
    selectAutoActionsForProjectPage,
    updateAutoActionById,
} from '../queries/AutoActionQueries.js';
import { isFlowSync } from './validation.js';

type TriggerDefinition = {
    type?: string;
    triggerType?: string;
    eventType?: string;
    scope?: string;
};

type NormalizedTaskEvent = {
    triggerType: string;
    projectId: string;
    taskId: string;
    actorId: string;
    traceId: string;
    autoActionId?: string;
    wasSnapshot?: Record<string, any>;
    startIndex?: number;
    startCursor?: any;
};

/**
 * AutoActionServiceImpl: The central brain of the Automation Engine.
 *
 * This service handles two distinct execution paths:
 * 1. Synchronous (Sync): Executes rules within the primary request lifecycle (e.g., during task creation).
 *    - Uses "Log and Proceed" fault tolerance: primary operations must NOT fail if automation fails.
 *    - Limited to top 10 rules to protect API latency.
 *
 * 2. Asynchronous (Async): Executes rules in the background via Kafka domain events.
 *    - Supports "Resumable Pipelines": execution is chunked into 5-step batches.
 *    - If a batch is incomplete, it emits a CONTINUE event to resume later via a cursor.
 *
 * All mutations (create/update/delete) are performed using Single-Query CTEs with outbox signaling.
 */
export class AutoActionServiceImpl implements AutoActionService {
    // ─── Private Helpers ────────────────────────────────────────────────────────

    /**
     * Checks if an active auto-action with the given name already exists in the same project.
     * Throws an error if a conflict is found.
     */
    private async checkNameUniqueness(
        projectId: string,
        name: string,
        excludeId?: string,
    ): Promise<void> {
        const existing = await selectActiveAutoActionByName(
            projectId,
            name,
            excludeId,
        );
        if (existing) {
            throw new Error(
                `An active auto-action with the name "${name}" already exists in project "${projectId}".`,
            );
        }
    }

    /**
     * Validates the structure and sync-safety of the pipeline steps.
     */
    private validatePipeline(steps: any, isSync: boolean): void {
        const parsedSteps = autoActionFlowSchema.parse(steps);

        if (isSync) {
            const syncSafe = isFlowSync(parsedSteps);
            if (!syncSafe) {
                throw new Error(
                    `Auto action is configured as synchronous but contains asynchronous steps (actions or conditions).`,
                );
            }
        }
    }

    private parseJsonArray(value: unknown): any[] {
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return [];

        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private triggerMatches(
        autoAction: AutoAction,
        triggerType: string,
        scope: EntityScope,
    ): boolean {
        const triggers = this.parseJsonArray(autoAction.triggers);

        return triggers.some((trigger: TriggerDefinition | string) => {
            if (typeof trigger === 'string') return trigger === triggerType;

            const candidateType =
                trigger.type || trigger.triggerType || trigger.eventType;
            const candidateScope = trigger.scope;

            return (
                candidateType === triggerType &&
                (!candidateScope || candidateScope === scope)
            );
        });
    }

    /**
     * Normalizes disparate domain events into a standard internal format.
     * Handles Task Lifecycle events and Pipeline Continuation events.
     * This ensures the rest of the engine (conditions/actions) always sees consistent data.
     */
    private normalizeTaskEvent(
        event: DomainEvent,
    ): NormalizedTaskEvent | undefined {
        if (
            event.type !== KAFKA_EVENTS.TASK.CREATED &&
            event.type !== KAFKA_EVENTS.TASK.UPDATED &&
            event.type !== KAFKA_EVENTS.PIPELINE.CONTINUE
        ) {
            return undefined;
        }

        const data = event.data || {};

        // Special handling for resume events
        if (event.type === KAFKA_EVENTS.PIPELINE.CONTINUE) {
            return {
                triggerType: event.type,
                projectId: data.projectId,
                taskId: data.entityId, // resume events use entityId
                actorId: data.actorId || 'system:auto-action',
                traceId: data.traceId || event.eventId,
                autoActionId: data.autoActionId,
                wasSnapshot: data.wasSnapshot,
                startIndex: data.startIndex,
                startCursor: data.startCursor,
            };
        }

        const projectId = data.projectId;
        const taskId = data.taskId;
        if (!projectId || !taskId) {
            logger.warn(
                `AutoActionService.handleTaskEvents: skipping malformed "${event.type}" event "${event.eventId}"`,
            );
            return undefined;
        }

        return {
            triggerType: event.type,
            projectId,
            taskId,
            actorId: data.actorId || 'system:auto-action',
            traceId: data.traceId || event.eventId,
            wasSnapshot:
                data.old && typeof data.old === 'object'
                    ? (data.old as Record<string, any>)
                    : undefined,
        };
    }

    /**
     * The core dispatcher for automation rules.
     * Filters rules by trigger type and sync/async preference, then executes pipelines.
     *
     * @param normalized Standardized event data
     * @param isSyncOnly If true, only executes rules marked is_sync: true
     * @param isAsyncOnly If true, only executes rules marked is_sync: false
     */
    private async executeMatchingTaskActions(
        normalized: NormalizedTaskEvent,
        isSyncOnly = false,
        isAsyncOnly = false,
    ): Promise<void> {
        const candidates = await selectActiveAutoActionsForProject(
            normalized.projectId,
        );

        let matches: AutoAction[] = [];

        // RES-02: Support Resume Events
        if (normalized.triggerType === KAFKA_EVENTS.PIPELINE.CONTINUE) {
            const data = normalized as any;
            if (data.autoActionId) {
                const targeted = candidates.find(
                    (a) => a.id === data.autoActionId,
                );
                if (targeted) matches = [targeted];
            }
        } else {
            matches = candidates.filter((autoAction) =>
                this.triggerMatches(
                    autoAction,
                    normalized.triggerType,
                    EntityScope.TASK,
                ),
            );
        }

        if (isSyncOnly) {
            matches = matches.filter((a) => a.is_sync);
            // ORCH-03: Execution Guards - limit sync actions to top 10
            if (matches.length > 10) {
                logger.warn(
                    `AutoActionService: Truncating sync actions for task ${normalized.taskId} from ${matches.length} to 10 to protect API latency.`,
                );
                matches = matches.slice(0, 10);
            }
        }

        if (isAsyncOnly) {
            matches = matches.filter((a) => !a.is_sync);
        }

        if (matches.length === 0) {
            logger.debug(
                `AutoActionService: no matches for "${normalized.triggerType}" in project "${normalized.projectId}" (syncOnly: ${isSyncOnly}, asyncOnly: ${isAsyncOnly})`,
            );
            return;
        }

        for (const autoAction of matches) {
            try {
                const result = await this.executePipeline(
                    autoAction.id,
                    normalized.taskId,
                    normalized.actorId,
                    normalized.traceId,
                    normalized.wasSnapshot,
                    normalized.startIndex || 0,
                    normalized.startCursor,
                    isSyncOnly ? 10 : 5, // Limit steps per run: 10 for sync, 5 for async
                );

                if (!result.completed) {
                    logger.info(
                        `AutoActionService: Pipeline "${autoAction.name}" (${autoAction.id}) is incomplete (stopped at index ${result.lastProcessedIndex}). Re-emitting resume event.`,
                    );

                    await appendEventsToOutbox(db, [
                        {
                            kafka_topic: KAFKA_TOPICS.AUTO_ACTION,
                            kafka_key: normalized.projectId,
                            payload: {
                                type: KAFKA_EVENTS.PIPELINE.CONTINUE,
                                autoActionId: autoAction.id,
                                entityId: normalized.taskId,
                                projectId: normalized.projectId,
                                actorId: normalized.actorId,
                                traceId: normalized.traceId,
                                wasSnapshot: normalized.wasSnapshot,
                                startIndex: result.lastProcessedIndex + 1,
                            },
                        },
                    ]);
                }
            } catch (err) {
                if (isSyncOnly) {
                    // ORCH-02: Log and Proceed Fault Tolerance
                    logger.error(
                        `AutoActionService: Sync AutoAction "${autoAction.name}" (${autoAction.id}) failed for task ${normalized.taskId}. Log and Proceed.`,
                        err,
                    );
                } else {
                    throw err;
                }
            }
        }
    }

    private async assertActorCanAccessProject(
        actorId: string,
        projectId: string,
    ): Promise<void> {
        const projects = await projectService.getProjectsByActorIdAndProjectIds(
            actorId,
            [projectId],
        );

        if (projects.length === 0) {
            throw new Error(
                `Actor "${actorId}" is not authorized for project "${projectId}".`,
            );
        }
    }

    private mapCreateInput(
        actorId: string,
        input: CreateAutoActionForActorInput,
    ): NewAutoAction {
        return {
            fk_project_id: input.projectId,
            name: input.name,
            description: input.description ?? null,
            triggers: JSON.stringify(input.triggers ?? []) as any,
            steps: JSON.stringify(input.steps ?? []) as any,
            is_active: input.isActive,
            is_sync: input.isSync,
            created_by: actorId,
            updated_by: actorId,
        };
    }

    private mapUpdateInput(
        actorId: string,
        input: UpdateAutoActionForActorInput,
    ): AutoActionUpdate {
        return {
            name: input.name,
            description: input.description,
            triggers:
                input.triggers !== undefined
                    ? (JSON.stringify(input.triggers) as any)
                    : undefined,
            steps:
                input.steps !== undefined
                    ? (JSON.stringify(input.steps) as any)
                    : undefined,
            is_active: input.isActive,
            is_sync: input.isSync,
            updated_by: actorId,
        };
    }

    // ─── Public Interface ────────────────────────────────────────────────────────

    async createAutoAction(data: NewAutoAction): Promise<AutoAction> {
        const name = data.name || 'Untitled Auto Action';
        const isActive =
            data.is_active !== undefined ? (data.is_active as boolean) : true;
        const isSync =
            data.is_sync !== undefined ? (data.is_sync as boolean) : true;

        logger.info(
            `AutoActionService.createAutoAction: creating "${name}" in project "${data.fk_project_id}"`,
        );

        if (isActive) {
            await this.checkNameUniqueness(data.fk_project_id, name);
        }

        const rawSteps = data.steps;
        const steps =
            typeof rawSteps === 'string' ? JSON.parse(rawSteps) : rawSteps;
        this.validatePipeline(steps || [], isSync);

        const insertPayload = {
            ...data,
            name,
            is_active: isActive,
            is_sync: isSync,
            steps:
                data.steps !== undefined
                    ? ((typeof data.steps === 'string'
                          ? data.steps
                          : JSON.stringify(data.steps)) as any)
                    : '[]',
            triggers:
                data.triggers !== undefined
                    ? ((typeof data.triggers === 'string'
                          ? data.triggers
                          : JSON.stringify(data.triggers)) as any)
                    : '[]',
            version: 1,
        };

        const created = await insertAutoAction(insertPayload);
        logger.info(
            `AutoActionService.createAutoAction: created "${name}" (${created.id})`,
        );
        return created;
    }

    async updateAutoAction(
        id: string,
        data: AutoActionUpdate,
        expectedVersion: number,
    ): Promise<AutoAction> {
        logger.info(
            `AutoActionService.updateAutoAction: updating "${id}" (expected version ${expectedVersion})`,
        );

        const current = await selectAutoActionById(id);
        if (!current) {
            throw new Error(`Auto Action "${id}" not found.`);
        }

        if (current.version !== expectedVersion) {
            throw new Error(
                `Optimistic locking failure: expected version ${expectedVersion} but found ${current.version}`,
            );
        }

        const newName = data.name !== undefined ? data.name : current.name;
        const newIsActive =
            data.is_active !== undefined
                ? (data.is_active as boolean)
                : current.is_active;

        if (
            newIsActive &&
            (data.name !== undefined || data.is_active !== undefined)
        ) {
            await this.checkNameUniqueness(
                current.fk_project_id,
                newName as string,
                id,
            );
        }

        const newIsSync =
            data.is_sync !== undefined
                ? (data.is_sync as boolean)
                : current.is_sync;
        const rawSteps = data.steps !== undefined ? data.steps : current.steps;
        const steps =
            typeof rawSteps === 'string' ? JSON.parse(rawSteps) : rawSteps;

        if (data.steps !== undefined || data.is_sync !== undefined) {
            this.validatePipeline(steps || [], newIsSync);
        }

        const updatePayload = {
            ...data,
            steps:
                data.steps !== undefined
                    ? ((typeof data.steps === 'string'
                          ? data.steps
                          : JSON.stringify(data.steps)) as any)
                    : undefined,
            triggers:
                data.triggers !== undefined
                    ? ((typeof data.triggers === 'string'
                          ? data.triggers
                          : JSON.stringify(data.triggers)) as any)
                    : undefined,
            version: current.version + 1,
            updated_at: new Date(),
        };

        // Filter out undefined values to avoid Kysely issues
        const cleanedPayload = Object.fromEntries(
            Object.entries(updatePayload).filter(([_, v]) => v !== undefined),
        );

        const updated = await updateAutoActionById(
            id,
            cleanedPayload,
            expectedVersion,
        );
        logger.info(
            `AutoActionService.updateAutoAction: updated "${id}" to version ${updated.version}`,
        );
        return updated;
    }

    async deleteAutoAction(id: string): Promise<void> {
        logger.info(`AutoActionService.deleteAutoAction: deleting "${id}"`);
        await deleteAutoActionById(id);
        logger.info(`AutoActionService.deleteAutoAction: deleted "${id}"`);
    }

    async getAutoActionsForProject(projectId: string): Promise<AutoAction[]> {
        logger.debug(
            `AutoActionService.getAutoActionsForProject: fetching for project "${projectId}"`,
        );
        return selectAutoActionsForProject(projectId);
    }

    async getAutoActionById(id: string): Promise<AutoAction | undefined> {
        logger.debug(`AutoActionService.getAutoActionById: fetching "${id}"`);
        return selectAutoActionById(id);
    }

    async getAutoActionsByIds(ids: string[]): Promise<AutoAction[]> {
        logger.debug(
            `AutoActionService.getAutoActionsByIds: fetching ${ids.length} auto action(s)`,
        );
        return selectAutoActionsByIds(ids);
    }

    async getAutoActionForActor(
        actorId: string,
        id: string,
    ): Promise<AutoAction | undefined> {
        const autoAction = await selectAutoActionById(id);
        if (!autoAction) return undefined;

        await this.assertActorCanAccessProject(
            actorId,
            autoAction.fk_project_id,
        );
        return autoAction;
    }

    async getAutoActionsForActorByIds(
        actorId: string,
        ids: string[],
    ): Promise<AutoAction[]> {
        const autoActions = await selectAutoActionsByIds(ids);
        if (autoActions.length === 0) return [];

        const projectIds = Array.from(
            new Set(autoActions.map((autoAction) => autoAction.fk_project_id)),
        );
        const authorizedProjects =
            await projectService.getProjectsByActorIdAndProjectIds(
                actorId,
                projectIds,
            );
        const authorizedProjectIds = new Set(
            authorizedProjects.map((project) => project.id),
        );

        return autoActions.filter((autoAction) =>
            authorizedProjectIds.has(autoAction.fk_project_id),
        );
    }

    async getAutoActionsForProjectConnection(
        actorId: string,
        projectId: string,
        pagination: PaginationParams = {},
    ): Promise<AutoActionConnection> {
        await this.assertActorCanAccessProject(actorId, projectId);

        const { autoActions, totalCount, nextCursor, prevCursor } =
            await selectAutoActionsForProjectPage(projectId, pagination);

        return {
            edges: autoActions.map((autoAction) => ({
                node: autoAction,
                cursor: encodeCursor(
                    autoAction.created_at.toISOString(),
                    autoAction.id,
                ),
            })),
            pageInfo: {
                hasNextPage: !!nextCursor,
                hasPreviousPage: !!prevCursor,
                startCursor: prevCursor,
                endCursor: nextCursor,
            },
            totalCount,
        };
    }

    async createAutoActionForActor(
        actorId: string,
        input: CreateAutoActionForActorInput,
    ): Promise<AutoAction> {
        await this.assertActorCanAccessProject(actorId, input.projectId);
        return this.createAutoAction(this.mapCreateInput(actorId, input));
    }

    async updateAutoActionForActor(
        actorId: string,
        id: string,
        expectedVersion: number,
        input: UpdateAutoActionForActorInput,
    ): Promise<AutoAction> {
        const current = await selectAutoActionById(id);
        if (!current) {
            throw new Error(`Auto Action "${id}" not found.`);
        }

        await this.assertActorCanAccessProject(actorId, current.fk_project_id);
        return this.updateAutoAction(
            id,
            this.mapUpdateInput(actorId, input),
            expectedVersion,
        );
    }

    async deleteAutoActionForActor(actorId: string, id: string): Promise<void> {
        const current = await selectAutoActionById(id);
        if (!current) {
            throw new Error(`Auto Action "${id}" not found.`);
        }

        await this.assertActorCanAccessProject(actorId, current.fk_project_id);
        await this.deleteAutoAction(id);
    }

    /**
     * Entry point for ASYNC background execution (Kafka Consumer).
     * Processes batches of events and filters out already-processed traceIds for idempotency.
     * Only triggers rules marked as is_sync: false.
     */
    async handleTaskEvents(events: DomainEvent[]): Promise<void> {
        if (events.length === 0) return;

        logger.info(
            `AutoActionService.handleTaskEvents: processing ${events.length} task event(s)`,
        );

        for (const event of events) {
            const eventId = (event.data as any)?.traceId;
            if (!eventId) continue;

            const alreadyProcessed = await isEventProcessed(eventId);
            if (alreadyProcessed) {
                logger.info(
                    `AutoActionService: Skipping duplicate event ${eventId}`,
                );
                continue;
            }

            const normalized = this.normalizeTaskEvent(event);
            if (!normalized) continue;

            // Kafka handler should ONLY execute ASYNC actions.
            // Sync actions are now handled in the request lifecycle (Phase 47).
            await this.executeMatchingTaskActions(normalized, false, true);
            await markEventProcessed(eventId);
        }
    }

    /**
     * Entry point for SYNC request-lifecycle execution (Service Hook).
     * Runs immediately during Task mutations. Failure is absorbed to protect the primary operation.
     * Only triggers rules marked as is_sync: true.
     */
    async handleSyncTaskEvents(event: DomainEvent): Promise<void> {
        const normalized = this.normalizeTaskEvent(event);
        if (!normalized) return;

        logger.debug(
            `AutoActionService.handleSyncTaskEvents: processing sync actions for task ${normalized.taskId}`,
        );

        await this.executeMatchingTaskActions(normalized, true, false);
    }

    getTemplateForScope(scope: EntityScope, isSync = false): ScopeTemplate {
        return getTemplateForScope(scope, isSync);
    }

    async executePipeline(
        autoActionId: string,
        entityId: string,
        actorId: string,
        traceId: string,
        wasSnapshot: any,
        startIndex = 0,
        startCursor?: any,
        maxSteps?: number,
    ): Promise<any> {
        return executeAutoActionPipeline(
            autoActionId,
            entityId,
            actorId,
            traceId,
            wasSnapshot,
            startIndex,
            startCursor,
            maxSteps,
        );
    }
}
//TODO CTE for single query db
//TODO move the queries to queries
//TODO transactional boundary NOT single
//TODO when we are doing operation such as task create and delete we need to run sync auto actions in sync and then only return once the sync actions are done
//TODO for async we will use listener
// For async actions it will support re-emitting the event with the pointer to start from and other info so that it can be picked up again so basically batching. See delete task or self referencing chunk stuffs to understand how
