import { z } from 'zod';

/**
 * Supported Entity Scopes for Automations.
 */
export enum EntityScope {
    TASK = 'TASK',
}

/**
 * Single action step within a pipeline.
 */
export const actionStepSchema = z.object({
    type: z.literal('action'),
    actionId: z.string(),
    inputs: z.any(),
});

/**
 * Unified schema for any step within an auto-action pipeline.
 */
export const pipelineStepSchema = z.discriminatedUnion('type', [
    actionStepSchema,
]);

export type ActionStep = z.infer<typeof actionStepSchema>;
export type PipelineStep = z.infer<typeof pipelineStepSchema>;

/**
 * Schema for the full auto-action execution flow.
 */
export const autoActionFlowSchema = z.array(pipelineStepSchema);

export interface ActionTemplate {
    id: string;
    name: string;
    description: string;
    isSync: boolean;
    scope: string;
    inputSchema: any;
}

export interface ConditionTemplate {
    type: string;
    name: string;
    description?: string;
    isSync: boolean;
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

export interface BehaviorSetting {
    id: string;
    name: string;
    description: string;
    category: 'GUARD' | 'CASCADE' | 'AUTOMATION';
    defaultValue: boolean;
}

export interface BehaviorSettingsCatalog {
    settings: BehaviorSetting[];
}
