import { updateTask } from '../../../task/internal/TaskQueries.ts';
import { conditionEvaluator, type EvaluationContext } from './ConditionEvaluator.ts';
import type { AutomationRule } from '../../TaskTriggerService.ts';

export interface Action {
    type: string;
    params: any;
}

export class ActionHandler {
    /**
     * Processes a sequence of rules. 
     * Each rule is evaluated, and if successful, its actions are executed.
     */
    async handleRules(rules: AutomationRule[], context: EvaluationContext) {
        let currentContext = { ...context };

        for (const rule of rules) {
            const isMatch = conditionEvaluator.evaluate(rule.conditions, currentContext);
            
            if (isMatch) {
                console.log(`[ActionHandler] Executing rule ${rule.id} (Seq: ${rule.sequenceNumber})`);
                
                for (const action of rule.actions as Action[]) {
                    const result = await this.executeAction(action, currentContext, rule.canPropagate);
                    
                    // If the action updated the task, we update the context for the next rule in the sequence
                    if (result && result.updatedTask) {
                        currentContext = {
                            ...currentContext,
                            newState: result.updatedTask,
                            updates: { ...currentContext.updates, ...action.params }
                        };
                    }
                }
            }
        }
    }

    private async executeAction(action: Action, context: EvaluationContext, canPropagate: boolean) {
        const { newState } = context;

        switch (action.type) {
            case 'UPDATE_TASK':
                console.log(`[ActionHandler] Performing UPDATE_TASK on ${newState.id} (Propagate: ${canPropagate}, Current Depth: ${context.depth})`);
                const updatedTask = await updateTask({
                    userId: 'SYSTEM',
                    projectId: newState.fk_project_id,
                    taskId: newState.id,
                    version: newState.version,
                    ...action.params,
                    shouldPropagate: canPropagate,
                    incomingDepth: context.depth
                });
                return { updatedTask };

            case 'WEBHOOK':
                console.log(`[ActionHandler] Sending WEBHOOK to ${action.params.url}`);
                // Implementation for webhook (Phase 1: Mock/Log)
                return null;

            default:
                console.warn(`[ActionHandler] Unknown action type: ${action.type}`);
                return null;
        }
    }
}

export const actionHandler = new ActionHandler();
