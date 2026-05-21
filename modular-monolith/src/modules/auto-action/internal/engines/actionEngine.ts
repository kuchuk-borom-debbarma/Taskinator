import type { ActionDefinition } from '../../types.js';

/**
 * Isolated Registry containing all registered action definitions.
 */
export class ActionRegistry {
    private readonly actions = new Map<string, ActionDefinition<any>>();

    /**
     * Clears all registered actions (primarily for testing purposes).
     */
    public clear(): void {
        this.actions.clear();
    }

    /**
     * Registers an action definition.
     */
    public registerAction(action: ActionDefinition<any>): void {
        if (this.actions.has(action.id)) {
            throw new Error(
                `Action with id "${action.id}" is already registered.`,
            );
        }
        this.actions.set(action.id, action);
    }

    /**
     * Retrieves a registered action by its id.
     */
    public getAction(id: string): ActionDefinition<any> | undefined {
        return this.actions.get(id);
    }

    /**
     * Lists all registered actions.
     */
    public getAllActions(): ActionDefinition<any>[] {
        return Array.from(this.actions.values());
    }
}

/**
 * Singleton instance of the isolated action registry.
 */
export const actionRegistry = new ActionRegistry();

/**
 * Executes an Action by its ID against a state context and inputs.
 * Validates the inputs against the action's schema before triggering the handler.
 */
export async function executeAction(
    actionId: string,
    ctx: any,
    inputs: any,
): Promise<unknown> {
    const action = actionRegistry.getAction(actionId);
    if (!action) {
        throw new Error(`Action "${actionId}" is not registered.`);
    }

    // Validate inputs using Zod
    const validatedInputs = action.inputSchema.parse(inputs);

    // Call the handler
    return await action.handler(ctx, validatedInputs);
}
