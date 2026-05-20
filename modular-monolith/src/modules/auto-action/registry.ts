import { z } from 'zod';
import type { ActionDefinition, TriggerDefinition } from './types.js';
import { EntityScope, taskContextSchema } from './types.js';

/**
 * Registry containing all available triggers and actions.
 * Generates frontend-friendly metadata templates dynamically.
 */
export class AutoActionRegistry {
    private readonly triggers = new Map<string, TriggerDefinition>();
    private readonly actions = new Map<string, ActionDefinition<any>>();

    /**
     * Clears all registered triggers and actions (primarily for testing purposes).
     */
    public clear(): void {
        this.triggers.clear();
        this.actions.clear();
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

    /**
     * Dynamically builds a rich automation template for a given entity scope.
     * Exposes schema structures and compatible actions to the frontend.
     */
    public getTemplateForScope(scope: EntityScope) {
        if (scope !== EntityScope.TASK) {
            throw new Error(`Unsupported scope: ${scope}`);
        }

        // Get triggers matching the active scope
        const scopeTriggers = Array.from(this.triggers.values())
            .filter((t) => t.scope === scope)
            .map((t) => ({
                id: t.id,
                name: t.name,
            }));

        // Get actions matching the active scope
        const scopeActions = Array.from(this.actions.values())
            .filter((a) => a.scope === scope)
            .map((a) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                isAsync: a.isAsync,
                inputs: this.serializeZodSchema(a.inputSchema),
            }));

        // Dynamically extract available fields from the Zod taskContextSchema
        const contextFields = Object.keys(taskContextSchema.shape);

        return {
            scope,
            triggers: scopeTriggers,
            actions: scopeActions,
            contextFields,
        };
    }

    /**
     * Internal helper to convert a Zod object schema into a simple JSON-serializable schema.
     */
    private serializeZodSchema(
        schema: z.ZodObject<any>,
    ): Record<string, { type: string; required: boolean }> {
        const result: Record<string, { type: string; required: boolean }> = {};
        const shape = schema.shape;

        for (const [key, value] of Object.entries(shape)) {
            let isRequired = true;
            let currentType = 'unknown';

            let currentZodType: z.ZodTypeAny = value as z.ZodTypeAny;

            // Unwrap optional or nullable types
            while (
                currentZodType instanceof z.ZodOptional ||
                currentZodType instanceof z.ZodNullable
            ) {
                if (currentZodType instanceof z.ZodOptional) {
                    isRequired = false;
                }
                currentZodType = (currentZodType as any)._def.innerType;
            }

            if (currentZodType instanceof z.ZodString) {
                currentType = 'string';
            } else if (currentZodType instanceof z.ZodNumber) {
                currentType = 'number';
            } else if (currentZodType instanceof z.ZodBoolean) {
                currentType = 'boolean';
            } else if (currentZodType instanceof z.ZodEnum) {
                currentType = 'enum';
            }

            result[key] = {
                type: currentType,
                required: isRequired,
            };
        }

        return result;
    }
}

/**
 * Thread-safe singleton instance of the auto action registry.
 */
export const autoActionRegistry = new AutoActionRegistry();
