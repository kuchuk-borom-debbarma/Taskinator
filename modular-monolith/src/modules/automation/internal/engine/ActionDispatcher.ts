import type { AutomationPayload, Action, DispatchContext } from './DSL.ts';
import { MAX_CASCADE_DEPTH } from './DSL.ts';
import { evaluateRuleGroup } from './ConditionEvaluator.ts';
import { resolveTarget } from './TargetResolver.ts';

const MAX_DEPTH: typeof MAX_CASCADE_DEPTH = 5;

/**
 * Runs the full automation payload against a state transition.
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
            `[AutomationEngine] MATCH: "${rule.name || 'Untitled'}" ` +
                `[ID:${context.correlationId.slice(0, 8)}] (Depth:${context.depth})`,
        );

        // Conditions passed — execute all actions for this rule sequentially
        for (const action of rule.then) {
            await dispatchAction(context, action, targetCache, rule.name);
        }
    }
};

/**
 * Dispatches a single action.
 * Currently stubbed as Task actions are removed.
 */
const dispatchAction = async (
    context: DispatchContext,
    action: Action,
    cache: Map<string, string[]>,
    ruleName?: string,
): Promise<void> => {
    const targetIds = await resolveTarget(
        context.projectId,
        action,
        cache,
    );

    if (targetIds.length === 0) {
        return;
    }

    console.log(
        `[AutomationEngine] ACTION: "${action.type}" from Rule: "${ruleName || 'Untitled'}" [ID:${context.correlationId.slice(0, 8)}]`,
    );

    // Placeholder: In the future, this will dispatch to TaskService, TeamService, etc.
};
