import type {
    AutoAction,
    AutoActionUpdate,
    NewAutoAction,
} from '../../../../database/tables/AutoAction.js';
import { logger } from '../../../../logger/index.js';
import type { PaginationParams } from '../../../../types/pagination.ts';
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
    type BehaviorSettingsCatalog,
} from '../../types.js';
import {
    deleteAutoActionById,
    insertAutoAction,
    selectActiveAutoActionByName,
    selectAutoActionById,
    selectAutoActionsByIds,
    selectAutoActionsForProject,
    selectAutoActionsForProjectPage,
    updateAutoActionById,
} from '../queries/AutoActionQueries.js';

/**
 * AutoActionServiceImpl: Handles CRUD operations for AutoActions.
 * Legacy AST execution has been removed in favor of CWB (Condition-Wait-Behavior) rules.
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
    private validatePipeline(steps: any): void {
        autoActionFlowSchema.parse(steps);
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
        this.validatePipeline(steps || []);

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
            this.validatePipeline(steps || []);
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

    async getBehaviorSettingsCatalog(
        _projectId: string,
    ): Promise<BehaviorSettingsCatalog> {
        return {
            settings: [
                {
                    id: 'BLOCKER_RESOLUTION',
                    name: 'Auto-resolve Blockers',
                    description:
                        'Automatically resolves blocking tasks when their dependants are resolved.',
                    category: 'CASCADE',
                    defaultValue: true,
                },
                {
                    id: 'PARENT_DELETE_GUARD',
                    name: 'Parent Delete Guard',
                    description:
                        'Prevents deletion of parent tasks if they have active subtasks.',
                    category: 'GUARD',
                    defaultValue: true,
                },
                {
                    id: 'PRIORITY_CASCADE',
                    name: 'Priority Cascade',
                    description:
                        'Cascades priority changes from parent to subtasks.',
                    category: 'CASCADE',
                    defaultValue: false,
                },
                {
                    id: 'TEAM_CASCADE',
                    name: 'Team Cascade',
                    description:
                        'Cascades team assignment changes from parent to subtasks.',
                    category: 'CASCADE',
                    defaultValue: false,
                },
                {
                    id: 'BLOCKER_SAFETY_GUARD',
                    name: 'Blocker Safety Guard',
                    description:
                        'Prevents moving a task to "Done" if it still has active blockers.',
                    category: 'GUARD',
                    defaultValue: true,
                },
                {
                    id: 'MEMBER_ASSIGNMENT_GUARD',
                    name: 'Member Assignment Guard',
                    description:
                        "Ensures assigned members belong to the task's team.",
                    category: 'GUARD',
                    defaultValue: true,
                },
                {
                    id: 'CASCADE_DELETE',
                    name: 'Cascade Delete',
                    description:
                        'Automatically deletes subtasks when the parent is deleted.',
                    category: 'CASCADE',
                    defaultValue: false,
                },
                {
                    id: 'AUTO_NOTIFY',
                    name: 'Auto Notifications',
                    description:
                        'Sends notifications when task status changes.',
                    category: 'AUTOMATION',
                    defaultValue: true,
                },
            ],
        };
    }
}
//TODO CTE for single query db
//TODO move the queries to queries
//TODO transactional boundary NOT single
//TODO when we are doing operation such as task create and delete we need to run sync auto actions in sync and then only return once the sync actions are done
//TODO for async we will use listener
// For async actions it will support re-emitting the event with the pointer to start from and other info so that it can be picked up again so basically batching. See delete task or self referencing chunk stuffs to understand how
