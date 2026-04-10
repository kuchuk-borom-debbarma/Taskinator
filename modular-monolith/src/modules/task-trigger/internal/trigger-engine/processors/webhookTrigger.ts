import type { TaskTrigger } from '../../../TaskTriggerService.ts';

/**
 * Trigger that sends a webhook to a specified URL.
 * @param taskId
 * @param trigger
 * @param updates
 */
export const webhookTrigger = async (
    taskId: string,
    trigger: TaskTrigger,
    updates: any,
) => {
    if (trigger.triggerType !== 'WEBHOOK') {
        throw new Error(`Trigger type ${trigger.triggerType} not supported`);
    }

    const { url, secret } = trigger.triggerData;
    if (!url) {
        throw new Error(`url is required for trigger type WEBHOOK`);
    }

    console.log(`[Trigger Engine] Sending webhook for taskId: ${taskId} to ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Taskinator-Signature': secret || '', // Placeholder for security
            },
            body: JSON.stringify({
                taskId,
                projectId: trigger.projectId,
                triggerName: trigger.name,
                updates,
                timestamp: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            console.error(`[Trigger Engine] Webhook failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error(`[Trigger Engine] Webhook error:`, error);
    }
};
