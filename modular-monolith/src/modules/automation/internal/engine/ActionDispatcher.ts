import type { AutomationPayload, Action, DispatchContext } from './DSL.ts';
import { MAX_CASCADE_DEPTH } from './DSL.ts';
import { evaluateRuleGroup } from './ConditionEvaluator.ts';
import { resolveTarget } from './TargetResolver.ts';
import { automationBulkUpdateTasks } from '../AutomationQueries.ts';

const MAX_DEPTH: typeof MAX_CASCADE_DEPTH = 5;

/**
 * Runs the full automation payload against a state transition.
 *
 * Rules are evaluated and executed sequentially in order.
 * If a rule's conditions pass, all its actions are dispatched before
 * moving on to the next rule.
 *
 * Called by the AutomationListener after loading rules for the triggering entity.
 */
export const dispatchRules = async (
    payload: AutomationPayload,
    oldState: Record<string, any>,
    newState: Record<string, any>,
    context: DispatchContext,
): Promise<void> => {
    if (context.depth >= MAX_DEPTH) {
        console.warn(
            `[AutomationEngine] Max cascade depth (${MAX_DEPTH}) reached. Halting chain.`,
            {
                correlationId: context.correlationId,
                taskId: context.triggerTaskId,
            },
        );
        return;
    }

    const targetCache = new Map<string, string[]>();

    for (const rule of payload as any[]) {
        if (!rule.when || !rule.then || rule.then.length === 0) continue;

        const conditionsPassed = evaluateRuleGroup(
            oldState,
            newState,
            rule.when,
        );
        if (!conditionsPassed) continue;

        console.info(
            `[AutomationEngine] MATCH: "${rule.name || 'Untitled'}" for Task:${context.triggerTaskId} ` +
                `[ID:${context.correlationId.slice(0, 8)}] (Depth:${context.depth})`,
        );

        // Conditions passed — execute all actions for this rule sequentially
        for (const action of rule.then) {
            await dispatchAction(context, action, targetCache, rule.name);
        }
    }
};

/**
 * Dispatches a single action:
 * 1. Resolves the target direction → concrete task IDs
 * 2. Bulk-updates those tasks with action.params
 * 3. Emits to the Display Lane (always) and Logic Lane (if shouldPropagate)
 */
const dispatchAction = async (
    context: DispatchContext,
    action: Action,
    cache: Map<string, string[]>,
    ruleName?: string,
): Promise<void> => {
    const taskIds = await resolveTarget(
        context.triggerTaskId,
        context.projectId,
        action,
        cache,
    );

    if (taskIds.length === 0) {
        // Target resolved to nothing — skip silently
        return;
    }

    console.log(
        `[AutomationEngine] ACTION: "${action.type}" on ${taskIds.length} tasks ` +
            `from Rule: "${ruleName || 'Untitled'}" [ID:${context.correlationId.slice(0, 8)}]`,
    );

    const shouldPropagate = action.shouldPropagate ?? true;

    await automationBulkUpdateTasks(
        taskIds,
        context.projectId,
        action.params,
        { correlationId: context.correlationId, depth: context.depth },
        shouldPropagate,
    );
};
