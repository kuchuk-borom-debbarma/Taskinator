import { z } from 'zod';
import { autoActionRegistry } from './registry.js';
import { taskContextSchema } from './scopes/task/types.js';
import { EntityScope } from './types.js';

/**
 * Dynamically builds a rich automation template for a given entity scope.
 * Exposes schema structures and compatible actions/conditions to the frontend.
 */
export function getTemplateForScope(scope: EntityScope) {
    if (scope !== EntityScope.TASK) {
        throw new Error(`Unsupported scope: ${scope}`);
    }

    // Get triggers matching the active scope
    const scopeTriggers = autoActionRegistry
        .getAllTriggers()
        .filter((t) => t.scope === scope)
        .map((t) => ({
            id: t.id,
            name: t.name,
        }));

    // Get actions matching the active scope
    const scopeActions = autoActionRegistry
        .getAllActions()
        .filter((a) => a.scope === scope)
        .map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            isAsync: a.isAsync,
            inputs: serializeZodSchema(a.inputSchema),
        }));

    // Dynamically extract available fields from the Zod taskContextSchema
    const contextFields = Object.keys(taskContextSchema.shape);

    // Get conditions matching the active scope
    const conditionTypes = autoActionRegistry
        .getAllConditions()
        .filter((c) => c.scope === scope)
        .map((c) => ({
            type: c.type,
            name: c.name,
            isAsync: c.isAsync,
            inputs: serializeZodSchema(c.schema.omit({ type: true })),
        }));

    return {
        scope,
        triggers: scopeTriggers,
        actions: scopeActions,
        contextFields,
        conditionTypes,
    };
}

/**
 * Internal helper to convert a Zod object schema into a simple JSON-serializable schema.
 */
export function serializeZodSchema(
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
