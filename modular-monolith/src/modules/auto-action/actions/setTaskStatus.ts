import { z } from 'zod';
import { db } from '../../../database/index.ts';
import { autoActionRegistry } from '../registry.js';
import type { ActionDefinition, TaskContext } from '../types.js';
import { EntityScope } from '../types.js';

const inputSchema = z.object({
    newStatus: z.string(),
});

export const setTaskStatusAction: ActionDefinition<typeof inputSchema> = {
    id: 'set-task-status',
    name: 'Set Task Status',
    description:
        'Updates the status of a task using fresh database state and optimistic locking.',
    isAsync: false,
    scope: EntityScope.TASK,
    inputSchema,
    async handler(
        ctx: TaskContext,
        inputs: z.infer<typeof inputSchema>,
    ): Promise<void> {
        const { taskId } = ctx;
        const { newStatus } = inputs;

        // 1. Fetch always-fresh, up-to-date task data from the database
        const task = await db
            .selectFrom('project_task')
            .select(['id', 'version', 'status'])
            .where('id', '=', taskId as any)
            .executeTakeFirst();

        if (!task) {
            throw new Error(
                `[SetTaskStatusAction] Task with ID "${taskId}" not found.`,
            );
        }

        const currentVersion = task.version;

        // 2. Perform database update enforcing optimistic locking via the 'version' column
        const result = await db
            .updateTable('project_task')
            .set({
                status: newStatus,
                version: currentVersion + 1,
                updated_at: new Date().toISOString() as any,
            })
            .where('id', '=', taskId as any)
            .where('version', '=', currentVersion)
            .executeTakeFirst();

        // 3. If no rows were updated, a concurrent transaction has modified this task
        if (Number(result.numUpdatedRows) === 0) {
            throw new Error(
                `[SetTaskStatusAction] Optimistic lock failure: Task "${taskId}" was modified concurrently (expected version ${currentVersion}).`,
            );
        }
    },
};

/**
 * Registers the action in the global registry.
 */
export function registerSetTaskStatus(): void {
    autoActionRegistry.registerAction(setTaskStatusAction);
}
