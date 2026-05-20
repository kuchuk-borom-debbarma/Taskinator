import { z } from 'zod';
import { db } from '../../../database/index.ts';
import { autoActionRegistry } from '../registry.js';
import type { ActionDefinition, TaskContext } from '../types.js';
import { EntityScope } from '../types.js';

const inputSchema = z.object({
    userId: z
        .string()
        .describe('The target user ID to receive the notification.'),
    title: z.string().describe('The notification headline/title.'),
    message: z.string().describe('The detailed notification body/message.'),
});

export const sendInternalNotificationAction: ActionDefinition<
    typeof inputSchema
> = {
    id: 'send-internal-notification',
    name: 'Send Internal Notification',
    description: 'Dispatches an in-app notification to a target user.',
    isAsync: false,
    scope: EntityScope.TASK,
    inputSchema,
    async handler(
        ctx: TaskContext,
        inputs: z.infer<typeof inputSchema>,
    ): Promise<void> {
        const { userId, title, message } = inputs;

        // Insert notification record into partitioned database table
        await db
            .insertInto('internal_notification' as any)
            .values({
                fk_user_id: userId,
                title,
                message,
                type: 'AUTOMATION',
                metadata: JSON.stringify({
                    traceId: ctx.traceId,
                    triggeringTaskId: ctx.taskId,
                }) as any,
                is_read: false,
                created_at: new Date().toISOString() as any,
            })
            .execute();
    },
};

/**
 * Registers the action in the global registry.
 */
export function registerSendInternalNotification(): void {
    autoActionRegistry.registerAction(sendInternalNotificationAction);
}
