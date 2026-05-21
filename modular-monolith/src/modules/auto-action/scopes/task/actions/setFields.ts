import { z } from 'zod';
import { db } from '../../../../../database/index.js';
import { actionRegistry } from '../../../actionEngine.js';
import type { ActionDefinition } from '../../../types.js';
import { EntityScope } from '../../../types.js';
import type { TaskContext } from '../types.js';

const inputSchema = z.object({
    status: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    teamId: z.string().nullable().optional(),
    memberId: z.string().nullable().optional(),
});

export const setFieldsAction: ActionDefinition<typeof inputSchema> = {
    id: 'set-fields',
    name: 'Set Fields',
    description:
        'Updates multiple task fields using fresh database state and optimistic locking.',
    isAsync: false,
    scope: EntityScope.TASK,
    inputSchema,
    async handler(
        ctx: TaskContext,
        inputs: z.infer<typeof inputSchema>,
    ): Promise<void> {
        const { taskId } = ctx;

        // 1. Fetch always-fresh, up-to-date task data from the database
        const task = await db
            .selectFrom('project_task')
            .select(['id', 'version'])
            .where('id', '=', taskId as any)
            .executeTakeFirst();

        if (!task) {
            throw new Error(
                `[SetFieldsAction] Task with ID "${taskId}" not found.`,
            );
        }

        const currentVersion = task.version;

        // 2. Map input fields to database columns dynamically
        const updateData: any = {};
        let hasUpdates = false;

        if (inputs.status !== undefined) {
            updateData.status = inputs.status;
            hasUpdates = true;
        }
        if (inputs.title !== undefined) {
            updateData.title = inputs.title;
            hasUpdates = true;
        }
        if (inputs.description !== undefined) {
            updateData.description = inputs.description;
            hasUpdates = true;
        }
        if (inputs.teamId !== undefined) {
            updateData.fk_team_id = inputs.teamId;
            hasUpdates = true;
        }
        if (inputs.memberId !== undefined) {
            updateData.fk_member_id = inputs.memberId;
            hasUpdates = true;
        }

        if (!hasUpdates) {
            return; // No-op if no updates are specified
        }

        updateData.version = currentVersion + 1;
        updateData.updated_at = new Date().toISOString() as any;

        // 3. Perform database update enforcing optimistic locking via the 'version' column
        const result = await db
            .updateTable('project_task')
            .set((eb) => ({
                ...updateData,
                prev_status: eb.ref('status'),
                prev_priority: eb.ref('priority'),
                prev_title: eb.ref('title'),
                prev_team_id: eb.ref('fk_team_id'),
                prev_member_id: eb.ref('fk_member_id'),
            }))
            .where('id', '=', taskId as any)
            .where('version', '=', currentVersion)
            .executeTakeFirst();

        // 4. If no rows were updated, a concurrent transaction has modified this task
        if (Number(result.numUpdatedRows) === 0) {
            throw new Error(
                `[SetFieldsAction] Optimistic lock failure: Task "${taskId}" was modified concurrently (expected version ${currentVersion}).`,
            );
        }
    },
};

/**
 * Registers the action in the global registry.
 */
export function registerSetFields(): void {
    actionRegistry.registerAction(setFieldsAction);
}
