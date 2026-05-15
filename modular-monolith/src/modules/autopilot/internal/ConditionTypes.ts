import { z } from 'zod';

export const PredicateSchema = z.object({
    type: z.literal('predicate'),
    domain: z.string(),
    field: z.string(),
    operator: z.enum([
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'nin',
        'changed',
    ]),
    value: z.any().optional(),
});

export type Predicate = z.infer<typeof PredicateSchema>;

export type ConditionNode =
    | { type: 'and'; children: ConditionNode[] }
    | { type: 'or'; children: ConditionNode[] }
    | { type: 'not'; child: ConditionNode }
    | Predicate;

export const ConditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
    z.union([
        z.object({
            type: z.literal('and'),
            children: z.array(ConditionNodeSchema),
        }),
        z.object({
            type: z.literal('or'),
            children: z.array(ConditionNodeSchema),
        }),
        z.object({
            type: z.literal('not'),
            child: ConditionNodeSchema,
        }),
        PredicateSchema,
    ]),
);

export type ConditionTree = ConditionNode;
