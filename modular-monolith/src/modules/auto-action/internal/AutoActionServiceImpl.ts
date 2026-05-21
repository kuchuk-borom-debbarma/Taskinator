import type {
    AutoAction,
    AutoActionUpdate,
    NewAutoAction,
} from '../../../database/tables/AutoAction.ts';
import { logger } from '../../../logger/index.ts';
import type { AutoActionService } from '../AutoActionService.ts';
import {
    autoActionFlowSchema,
    isFlowSyncSafe,
} from '../auto-action-engine/types.ts';
import {
    deleteAutoActionById,
    insertAutoAction,
    selectActiveAutoActionByName,
    selectAutoActionById,
    selectAutoActionsForProject,
    updateAutoActionById,
} from './AutoActionQueries.ts';

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
            const syncSafe = isFlowSyncSafe(parsedSteps);
            if (!syncSafe) {
                throw new Error(
                    `Auto action is configured as synchronous but contains asynchronous steps (actions or conditions).`,
                );
            }
        }
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
}
