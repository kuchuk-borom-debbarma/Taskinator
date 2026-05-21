import type { z } from 'zod';
import { actionRegistry } from '../actionEngine.ts';
import { conditionRegistry } from '../conditionEngine.ts';
import { taskContextSchema } from '../scopes/task/types.ts';
import { EntityScope } from '../types.ts';

/**
 * Recursively converts a Zod schema into a JSON Schema draft-07 representation.
 */
export function convertZodToJSONSchema(schema: z.ZodTypeAny): any {
    const type =
        (schema as any).type ||
        (schema as any)._def?.type ||
        (schema as any)._def?.typeName;

    const isObject = type === 'object' || type === 'ZodObject';
    const isEnum = type === 'enum' || type === 'ZodEnum';
    const isString = type === 'string' || type === 'ZodString';
    const isNumber = type === 'number' || type === 'ZodNumber';
    const isBoolean = type === 'boolean' || type === 'ZodBoolean';
    const isLiteral = type === 'literal' || type === 'ZodLiteral';
    const isOptional = type === 'optional' || type === 'ZodOptional';
    const isNullable = type === 'nullable' || type === 'ZodNullable';
    const isUnion =
        type === 'union' ||
        type === 'ZodUnion' ||
        type === 'ZodDiscriminatedUnion' ||
        type === 'discriminatedUnion';
    const isEffects = type === 'effects' || type === 'ZodEffects';
    const isArray = type === 'array' || type === 'ZodArray';
    const isLazy = type === 'lazy' || type === 'ZodLazy';

    if (isObject) {
        const properties: Record<string, any> = {};
        const required: string[] = [];
        const shape =
            (schema as any).shape ||
            (schema as any)._def?.shape?.() ||
            (schema as any)._def?.shape;
        for (const [key, value] of Object.entries(shape || {})) {
            properties[key] = convertZodToJSONSchema(value as z.ZodTypeAny);
            const valType =
                (value as any).type ||
                (value as any)._def?.type ||
                (value as any)._def?.typeName;
            const isValOptional =
                valType === 'optional' ||
                valType === 'ZodOptional' ||
                valType === 'nullable' ||
                valType === 'ZodNullable';
            if (!isValOptional) {
                required.push(key);
            }
        }
        return { type: 'object', properties, required };
    }

    if (isEnum) {
        const enumValues =
            (schema as any).options ||
            (schema as any)._def?.values ||
            Object.keys((schema as any)._def?.entries || {});
        return { type: 'string', enum: enumValues };
    }

    if (isString) {
        return { type: 'string' };
    }

    if (isNumber) {
        return { type: 'number' };
    }

    if (isBoolean) {
        return { type: 'boolean' };
    }

    if (isLiteral) {
        const literalValue =
            (schema as any)._def?.values?.[0] !== undefined
                ? (schema as any)._def?.values[0]
                : (schema as any)._def?.value !== undefined
                  ? (schema as any)._def?.value
                  : (schema as any).value;
        return { type: typeof literalValue, const: literalValue };
    }

    if (isOptional || isNullable) {
        const innerType = (schema as any)._def?.innerType;
        return convertZodToJSONSchema(innerType);
    }

    if (isUnion) {
        const options = (schema as any)._def?.options || [];
        return {
            anyOf: options.map((opt: any) => convertZodToJSONSchema(opt)),
        };
    }

    if (isEffects) {
        const innerSchema =
            (schema as any)._def?.schema || (schema as any)._def?.innerType;
        return convertZodToJSONSchema(innerSchema);
    }

    if (isArray) {
        const innerType =
            (schema as any)._def?.element || (schema as any)._def?.type;
        return {
            type: 'array',
            items: convertZodToJSONSchema(innerType),
        };
    }

    if (isLazy) {
        return { type: 'object' };
    }

    return { type: 'string' };
}

export interface ActionTemplate {
    id: string;
    name: string;
    description: string;
    isAsync: boolean;
    scope: string;
    inputSchema: any;
}

export interface ConditionTemplate {
    type: string;
    name: string;
    description?: string;
    isAsync: boolean;
    scope: string;
    schema: any;
}

export interface ScopeTemplate {
    triggers: Array<{
        type: string;
        name: string;
        description: string;
        scope: string;
    }>;
    contextFields: string[];
    actions: ActionTemplate[];
    conditions: ConditionTemplate[];
}

/**
 * Builds a dynamic template catalog for a specific scope.
 * Filters actions and conditions depending on the sync/async bounds if requested.
 */
export function getTemplateForScope(
    scope: EntityScope,
    isSync = false,
): ScopeTemplate {
    if (scope !== EntityScope.TASK) {
        throw new Error(`Unsupported scope: "${scope}"`);
    }

    const triggers = [
        {
            type: 'task.created',
            name: 'Task Created',
            description: 'Fires when a new task is created.',
            scope: 'TASK',
        },
        {
            type: 'task.updated',
            name: 'Task Updated',
            description: 'Fires when a task is modified.',
            scope: 'TASK',
        },
    ];

    const contextFields = Object.keys(taskContextSchema.shape);

    let actions = actionRegistry.getAllActions();
    if (isSync) {
        actions = actions.filter((a) => !a.isAsync);
    }
    const actionTemplates: ActionTemplate[] = actions.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        isAsync: a.isAsync,
        scope: a.scope,
        inputSchema: convertZodToJSONSchema(a.inputSchema),
    }));

    let conditions = conditionRegistry.getAllConditions();
    if (isSync) {
        conditions = conditions.filter((c) => !c.isAsync);
    }
    const conditionTemplates: ConditionTemplate[] = conditions.map((c) => ({
        type: c.type,
        name: c.name,
        description: c.description,
        isAsync: c.isAsync,
        scope: c.scope,
        schema: convertZodToJSONSchema(c.schema),
    }));

    return {
        triggers,
        contextFields,
        actions: actionTemplates,
        conditions: conditionTemplates,
    };
}
