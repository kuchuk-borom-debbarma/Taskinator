import eventBus, {
    KAFKA_EVENTS,
} from '../../../../utils/EventBus.ts';
import { automationManager } from '../AutomationManager.ts';
import { actionHandler } from '../trigger-engine/ActionHandler.ts';

export class TaskUpdatedListener {
    async init() {
        await eventBus.subscribe('task-update-automation-engine-group', {
            [KAFKA_EVENTS.PROJECT_TASK.UPDATED]: async (data: any) => {
                const { taskId, projectId, updates, oldState, newState, metadata } = data;
                
                // Safety: Depth counter prevents infinite loops
                const depth = metadata?.depth || 0;
                if (depth > 5) {
                    console.warn(`[Automation Engine] Recursion limit reached (depth: ${depth}) for task ${taskId}. Skipping triggers.`);
                    return;
                }

                console.log(`[Automation Engine] Processing task ${taskId} updates (Depth: ${depth})`);

                // 1. Fetch all applicable automation rules
                // We fetch both TASK-specific and PROJECT-wide rules
                const [taskRules, projectRules] = await Promise.all([
                    automationManager.getRulesForEvent({
                        triggerEvent: KAFKA_EVENTS.PROJECT_TASK.UPDATED,
                        scope: 'TASK',
                        targetId: taskId
                    }),
                    automationManager.getRulesForEvent({
                        triggerEvent: KAFKA_EVENTS.PROJECT_TASK.UPDATED,
                        scope: 'PROJECT',
                        targetId: projectId
                    })
                ]);

                const allRules = [...taskRules, ...projectRules];
                if (allRules.length === 0) return;

                // 2. Build Evaluation Context
                const context = {
                    updates: updates || {},
                    oldState: oldState || {},
                    newState: newState || {}
                };

                // 3. Hand over to ActionHandler for Sequential Execution
                // Note: Every event emitted by this engine will increment depth in the outbox relay
                await actionHandler.handleRules(allRules, context);
            },
        });
        console.log('[Automation Engine] TaskUpdatedListener started');
    }

    async stop() {}
}

export const taskTriggerListener = new TaskUpdatedListener();
