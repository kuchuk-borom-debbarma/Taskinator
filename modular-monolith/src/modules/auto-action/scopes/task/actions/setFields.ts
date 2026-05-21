import { z } from 'zod';
import { taskService } from '../../../../task/index.js';
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

        // 1. Fetch always-fresh, up-to-date task data via taskService
        const task = await taskService.getTaskContextById(taskId);

        if (!task) {
            throw new Error(
                `[SetFieldsAction] Task with ID "${taskId}" not found.`,
            );
        }

        // 2. No-op if no inputs are defined
        const hasUpdates = Object.values(inputs).some((v) => v !== undefined);
        if (!hasUpdates) {
            return;
        }

        // 3. Delegate to taskService.updateTask — prev_ writes happen inside TaskQueries.updateTask
        //    description is passed through directly; taskService.updateTask already supports it.
        await taskService.updateTask({
            actorId: ctx.actorId,
            projectId: task.fk_project_id,
            taskId,
            version: task.version,
            title: inputs.title,
            description: inputs.description,
            status: inputs.status,
            teamId: inputs.teamId,
            memberId: inputs.memberId,
        });
    },
};

/**
 * Registers the action in the global registry.
 */
export function registerSetFields(): void {
    actionRegistry.registerAction(setFieldsAction);
}
