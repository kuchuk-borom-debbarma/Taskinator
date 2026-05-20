import type {
    ActionDefinition,
    ConditionDefinition,
    TriggerDefinition,
} from './types.js';

/**
 * Registry containing all available triggers, actions, and conditions.
 */
export class AutoActionRegistry {
    private readonly triggers = new Map<string, TriggerDefinition>();
    private readonly actions = new Map<string, ActionDefinition<any>>();
    private readonly conditions = new Map<string, ConditionDefinition<any>>();

    /**
     * Clears all registered triggers, actions, and conditions (primarily for testing purposes).
     */
    public clear(): void {
        this.triggers.clear();
        this.actions.clear();
        this.conditions.clear();
    }

    /**
     * Registers a trigger definition.
     */
    public registerTrigger(trigger: TriggerDefinition): void {
        if (this.triggers.has(trigger.id)) {
            throw new Error(
                `Trigger with ID "${trigger.id}" is already registered.`,
            );
        }
        this.triggers.set(trigger.id, trigger);
    }

    /**
     * Registers an action definition.
     */
    public registerAction(action: ActionDefinition<any>): void {
        if (this.actions.has(action.id)) {
            throw new Error(
                `Action with ID "${action.id}" is already registered.`,
            );
        }
        this.actions.set(action.id, action);
    }

    /**
     * Registers a condition definition.
     */
    public registerCondition(condition: ConditionDefinition<any>): void {
        if (this.conditions.has(condition.type)) {
            throw new Error(
                `Condition with type "${condition.type}" is already registered.`,
            );
        }
        this.conditions.set(condition.type, condition);
    }

    /**
     * Retrieves a registered condition by its type.
     */
    public getCondition(type: string): ConditionDefinition<any> | undefined {
        return this.conditions.get(type);
    }

    /**
     * Lists all registered conditions.
     */
    public getAllConditions(): ConditionDefinition<any>[] {
        return Array.from(this.conditions.values());
    }

    /**
     * Retrieves a registered trigger by ID.
     */
    public getTrigger(id: string): TriggerDefinition | undefined {
        return this.triggers.get(id);
    }

    /**
     * Retrieves a registered action by ID.
     */
    public getAction(id: string): ActionDefinition<any> | undefined {
        return this.actions.get(id);
    }

    /**
     * Lists all registered triggers.
     */
    public getAllTriggers(): TriggerDefinition[] {
        return Array.from(this.triggers.values());
    }

    /**
     * Lists all registered actions.
     */
    public getAllActions(): ActionDefinition<any>[] {
        return Array.from(this.actions.values());
    }
}

/**
 * Thread-safe singleton instance of the auto action registry.
 */
export const autoActionRegistry = new AutoActionRegistry();
