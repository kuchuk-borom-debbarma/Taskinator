import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/index.ts';
import { logger } from '../../logger/index.ts';
import type {
    ActionOperation,
    ActionStep,
    ActionTarget,
} from '../../modules/autopilot/action-engine/types.ts';
import {
    type ConditionAST,
    isConditionBranch,
    isConditionLeaf,
} from '../../modules/autopilot/condition-engine/types.ts';
import {
    actionRepository,
    autopilotQueryService,
    conditionRepository,
} from '../../modules/autopilot/index.ts';
import type { AutopilotWithActions } from '../../modules/autopilot/internal/AutopilotQueryService.ts';
import type { PaginationParams } from '../../types/pagination.ts';
import { encodeCursor } from '../../utils/utils.ts';
import type { GraphQLContext } from '../context.ts';
import {
    MutationFailedError,
    NotFoundError,
    UnauthorizedError,
} from '../errors.ts';

/**
 * Mitigation: Limit maximum depth of ConditionNode recursion in resolvers (Threat T-26-02).
 */
const MAX_CONDITION_DEPTH = 10;

/**
 * Maps internal ConditionAST to GraphQL ConditionNode.
 */
function resolveConditionNode(ast: ConditionAST, depth = 0): any {
    if (depth > MAX_CONDITION_DEPTH) {
        throw new Error(
            `Maximum condition depth of ${MAX_CONDITION_DEPTH} exceeded`,
        );
    }

    if (isConditionBranch(ast)) {
        if (ast.logic === 'AND') {
            return {
                __typename: 'AndNode',
                children: ast.terms.map((t) =>
                    resolveConditionNode(t, depth + 1),
                ),
            };
        }
        if (ast.logic === 'OR') {
            return {
                __typename: 'OrNode',
                children: ast.terms.map((t) =>
                    resolveConditionNode(t, depth + 1),
                ),
            };
        }
        if (ast.logic === 'NOT') {
            return {
                __typename: 'NotNode',
                child: resolveConditionNode(ast.terms[0]!, depth + 1),
            };
        }
    }

    if (isConditionLeaf(ast)) {
        return {
            __typename: 'PredicateNode',
            domain: 'task', // Defaulting to task domain for v6.0 primitives
            field: ast.field,
            operator: ast.operator,
            value: ast.value,
        };
    }

    throw new Error('Invalid Condition AST node');
}

/**
 * Maps GraphQL ConditionNodeInput to internal ConditionAST.
 */
function mapInputToAST(input: any): ConditionAST {
    if (input.and) {
        return {
            logic: 'AND',
            terms: input.and.children.map(mapInputToAST),
        };
    }
    if (input.or) {
        return {
            logic: 'OR',
            terms: input.or.children.map(mapInputToAST),
        };
    }
    if (input.not) {
        return {
            logic: 'NOT',
            terms: [mapInputToAST(input.not.child)],
        };
    }
    if (input.predicate) {
        return {
            field: input.predicate.field,
            operator: input.predicate.operator,
            value: input.predicate.value,
        };
    }
    throw new Error('Invalid ConditionNodeInput');
}

function mapInputToASTAction(actionInput: any): ActionStep {
    const type = actionInput.type;
    const params = actionInput.params || {};
    const target = (params.target || 'self') as ActionTarget;

    // If it's already a primitive set/unset (for backwards compatibility/robustness)
    if (type === 'set' || type === 'unset') {
        return {
            target,
            operation: type as ActionOperation,
            field: params.field,
            value: params.value,
        };
    }

    switch (type) {
        case 'task.update_status':
            return {
                target,
                operation: 'set',
                field: 'status',
                value: params.status,
            };
        case 'task.update_priority':
            return {
                target,
                operation: 'set',
                field: 'priority',
                value: params.priority,
            };
        case 'task.assign_team':
            return {
                target,
                operation: 'set',
                field: 'fk_team_id',
                value: params.teamId,
            };
        case 'task.assign_member':
            return {
                target,
                operation: 'set',
                field: 'fk_member_id',
                value: params.memberId,
            };
        case 'task.unassign_team':
            return {
                target,
                operation: 'unset',
                field: 'fk_team_id',
            };
        case 'task.unassign_member':
            return {
                target,
                operation: 'unset',
                field: 'fk_member_id',
            };
        default:
            return {
                target,
                operation: type as ActionOperation,
                field: params.field,
                value: params.value,
            };
    }
}

function getStepRef(step: any): string {
    return step.refId ?? step.hash;
}

export const autopilotResolvers = {
    Autopilot: {
        id: (parent: AutopilotWithActions) => parent.id,
        fk_project_id: (parent: AutopilotWithActions) => parent.fk_project_id,
        triggers: (parent: AutopilotWithActions) => parent.triggers || [],
        isActive: (parent: AutopilotWithActions) => parent.is_active,
        pipeline: async (parent: AutopilotWithActions) => {
            const steps = parent.steps || [];
            const result: any[] = [];

            for (const step of steps) {
                if (step.type === 'condition') {
                    const refId = getStepRef(step);
                    const ast =
                        await conditionRepository.getConditionByHash(refId);
                    if (ast) {
                        result.push({
                            __typename: 'AutopilotCondition',
                            id: refId,
                            name: step.name || 'Condition',
                            definition: resolveConditionNode(ast),
                        });
                    }
                } else if (step.type === 'action') {
                    const refId = getStepRef(step);
                    const ast = await actionRepository.getActionByHash(refId);
                    if (ast) {
                        // ActionAST is ActionStep[]
                        // We map each ActionStep to an AutopilotAction for sequential visibility
                        ast.forEach((actionStep, index) => {
                            result.push({
                                __typename: 'AutopilotAction',
                                id: `${refId}-${index}`,
                                type: actionStep.operation,
                                params: {
                                    target: actionStep.target,
                                    field: actionStep.field,
                                    value: actionStep.value,
                                },
                            });
                        });
                    }
                }
            }
            return result;
        },
        createdAt: (parent: AutopilotWithActions) =>
            parent.created_at.toISOString(),
        version: (parent: AutopilotWithActions) => parent.version,
    },

    AutopilotConnection: {
        totalCount: (parent: { totalCount: number }) => parent.totalCount,
    },

    Query: {
        autopilots: async (
            _parent: any,
            {
                projectId,
                ...paginationArgs
            }: { projectId: string } & PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            logger.info(
                `[GraphQL] Query autopilots: Fetching rules for projectId=${projectId} (userId=${context.userId})`,
            );

            const { autopilots, totalCount, nextCursor, prevCursor } =
                await autopilotQueryService.getAutopilotsByProject(
                    projectId,
                    paginationArgs,
                );

            logger.debug(
                `[GraphQL] Query autopilots: Found ${autopilots.length} rules, totalCount=${totalCount}`,
            );

            return {
                edges: autopilots.map((a: AutopilotWithActions) => ({
                    node: a,
                    cursor: encodeCursor(a.created_at.toISOString(), a.id),
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
                totalCount,
            };
        },

        autopilotMetadata: async (
            _parent: any,
            { entityType }: { entityType: string },
        ) => {
            logger.info(
                `[GraphQL] Query autopilotMetadata: Fetching metadata schema for entityType=${entityType}`,
            );
            // Reflecting v6.0 ModularOperatorRegistry and Action primitives
            return {
                entities: [
                    {
                        type: entityType,
                        fields: [
                            {
                                name: 'status',
                                type: 'string',
                                operators: [
                                    'eq',
                                    'neq',
                                    'changed',
                                    'changedTo',
                                    'changedFrom',
                                ],
                            },
                            {
                                name: 'priority',
                                type: 'number',
                                operators: [
                                    'eq',
                                    'neq',
                                    'gt',
                                    'lt',
                                    'gte',
                                    'lte',
                                ],
                            },
                            {
                                name: 'assigneeId',
                                type: 'string',
                                operators: ['eq', 'neq', 'exists', 'empty'],
                            },
                        ],
                        actions: [
                            { type: 'set', parameters: {} },
                            { type: 'unset', parameters: {} },
                        ],
                    },
                ],
            };
        },
    },

    Mutation: {
        createAutopilot: async (
            _parent: any,
            { input }: { input: any },
            context: GraphQLContext,
        ): Promise<AutopilotWithActions> => {
            if (!context.userId) throw new UnauthorizedError();

            logger.info(
                `[GraphQL] Mutation createAutopilot: Creating new rule for projectId=${input.projectId} (userId=${context.userId})`,
                { triggers: input.triggers },
            );

            const autopilotId = uuidv4();
            const steps: any[] = [];

            try {
                // 1. Process and save logic structures to get hashes
                for (const stepInput of input.pipeline) {
                    if (stepInput.condition) {
                        const hash = await conditionRepository.saveCondition(
                            stepInput.condition.name || 'Condition',
                            mapInputToAST(stepInput.condition.definition),
                            input.projectId,
                            context.userId,
                        );
                        logger.debug(
                            `[GraphQL] Mutation createAutopilot: Saved condition "${stepInput.condition.name}" with hash=${hash}`,
                        );
                        steps.push({
                            type: 'condition',
                            refId: hash,
                            name: stepInput.condition.name,
                        });
                    } else if (stepInput.action) {
                        const hash = await actionRepository.saveAction(
                            'Action',
                            [mapInputToASTAction(stepInput.action)],
                            input.projectId,
                            context.userId,
                        );
                        logger.debug(
                            `[GraphQL] Mutation createAutopilot: Saved action with hash=${hash}`,
                        );
                        steps.push({ type: 'action', refId: hash });
                    }
                }

                // 2. Persist Autopilot main record
                await db
                    .insertInto('autopilot')
                    .values({
                        id: autopilotId,
                        fk_project_id: input.projectId,
                        name: 'Untitled Autopilot',
                        triggers: JSON.stringify(input.triggers || []) as any,
                        steps: JSON.stringify(steps) as any,
                        created_by: context.userId as string,
                        updated_by: context.userId as string,
                        is_active: true,
                        version: 1,
                        trace_history_enabled: false,
                    })
                    .execute();

                logger.debug(
                    `[GraphQL] Mutation createAutopilot: Persisted main record autopilotId=${autopilotId}`,
                );

                const created =
                    await autopilotQueryService.getAutopilotById(autopilotId);
                if (!created) {
                    throw new MutationFailedError(
                        'Autopilot created but failed to retrieve',
                    );
                }

                logger.info(
                    `[GraphQL] Mutation createAutopilot: Success. Created autopilotId=${autopilotId}, stepsCount=${steps.length}`,
                );
                return created;
            } catch (error: any) {
                logger.error(
                    `[GraphQL] Mutation createAutopilot: Failed. Error=${error.message}`,
                    { stack: error.stack },
                );
                throw new MutationFailedError(error.message);
            }
        },

        updateAutopilot: async (
            _parent: any,
            { id, input }: { id: string; input: any },
            context: GraphQLContext,
        ): Promise<AutopilotWithActions> => {
            if (!context.userId) throw new UnauthorizedError();

            logger.info(
                `[GraphQL] Mutation updateAutopilot: Updating rule autopilotId=${id} (userId=${context.userId})`,
            );

            const existing = await autopilotQueryService.getAutopilotById(id);
            if (!existing) {
                logger.warn(
                    `[GraphQL] Mutation updateAutopilot: Autopilot rule ${id} not found`,
                );
                throw new NotFoundError(`Autopilot with ID ${id} not found`);
            }

            const steps: any[] = [];
            if (input.pipeline) {
                for (const stepInput of input.pipeline) {
                    if (stepInput.condition) {
                        const hash = await conditionRepository.saveCondition(
                            stepInput.condition.name || 'Condition',
                            mapInputToAST(stepInput.condition.definition),
                            existing.fk_project_id,
                            context.userId,
                        );
                        logger.debug(
                            `[GraphQL] Mutation updateAutopilot: Saved condition "${stepInput.condition.name}" with hash=${hash}`,
                        );
                        steps.push({
                            type: 'condition',
                            refId: hash,
                            name: stepInput.condition.name,
                        });
                    } else if (stepInput.action) {
                        const hash = await actionRepository.saveAction(
                            'Action',
                            [mapInputToASTAction(stepInput.action)],
                            existing.fk_project_id,
                            context.userId,
                        );
                        logger.debug(
                            `[GraphQL] Mutation updateAutopilot: Saved action with hash=${hash}`,
                        );
                        steps.push({ type: 'action', refId: hash });
                    }
                }
            }

            await db
                .updateTable('autopilot')
                .set({
                    is_active:
                        input.isActive !== undefined
                            ? input.isActive
                            : existing.is_active,
                    triggers: input.triggers
                        ? (JSON.stringify(input.triggers) as any)
                        : existing.triggers,
                    steps: input.pipeline
                        ? (JSON.stringify(steps) as any)
                        : existing.steps,
                    version: sql`version + 1`,
                    updated_by: context.userId,
                    updated_at: new Date() as any,
                })
                .where('id', '=', id)
                .execute();

            const updated = await autopilotQueryService.getAutopilotById(id);
            if (!updated) {
                logger.error(
                    `[GraphQL] Mutation updateAutopilot: Failed to retrieve updated rule ${id}`,
                );
                throw new NotFoundError(
                    `Failed to retrieve updated Autopilot ${id}`,
                );
            }

            logger.info(
                `[GraphQL] Mutation updateAutopilot: Success. Updated autopilotId=${id}, newVersion=${updated.version}`,
            );
            return updated;
        },

        toggleAutopilot: async (
            _parent: any,
            { id, isActive }: { id: string; isActive: boolean },
            context: GraphQLContext,
        ): Promise<AutopilotWithActions> => {
            if (!context.userId) throw new UnauthorizedError();

            logger.info(
                `[GraphQL] Mutation toggleAutopilot: Setting isActive=${isActive} for autopilotId=${id} (userId=${context.userId})`,
            );

            const result = await db
                .updateTable('autopilot')
                .set({
                    is_active: isActive,
                    version: sql`version + 1`,
                    updated_by: context.userId,
                    updated_at: new Date() as any,
                })
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirst();

            if (!result) {
                logger.warn(
                    `[GraphQL] Mutation toggleAutopilot: Autopilot rule ${id} not found for toggle`,
                );
                throw new NotFoundError(`Autopilot with ID ${id} not found`);
            }

            logger.info(
                `[GraphQL] Mutation toggleAutopilot: Success. autopilotId=${id}, isActive=${result.is_active}, newVersion=${result.version}`,
            );
            return result;
        },

        deleteAutopilot: async (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ): Promise<boolean> => {
            if (!context.userId) throw new UnauthorizedError();

            logger.info(
                `[GraphQL] Mutation deleteAutopilot: Deleting autopilotId=${id} (userId=${context.userId})`,
            );

            const result = await db
                .deleteFrom('autopilot')
                .where('id', '=', id)
                .executeTakeFirst();

            const success =
                !!result.numDeletedRows && result.numDeletedRows > 0n;
            logger.info(
                `[GraphQL] Mutation deleteAutopilot: Completed. autopilotId=${id}, success=${success}`,
            );
            return success;
        },
    },
};
