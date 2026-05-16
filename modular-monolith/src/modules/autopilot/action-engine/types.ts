/**
 * Target entities supported by the Action Engine.
 */
export type ActionTarget =
    | 'self'
    | 'parent'
    | 'project'
    | 'team'
    | 'teamMember';

/**
 * Operations that can be performed on an entity field.
 */
export type ActionOperation = 'set' | 'unset';

/**
 * A single step in an Action sequence.
 */
export interface ActionStep {
    /**
     * The target entity for this step.
     */
    target: ActionTarget;

    /**
     * The field on the target entity to operate on.
     */
    field: string;

    /**
     * The operation to perform.
     */
    operation: ActionOperation;

    /**
     * The value to set (required for 'set' operation).
     */
    value?: any;
}

/**
 * An Action AST is a sequence of ActionSteps.
 *
 * This sequence is executed atomically against a triggering context.
 */
export type ActionAST = ActionStep[];

/**
 * Represents a persisted Action with its structural hash.
 */
export interface PersistedAction {
    hash: string;
    ast: ActionAST;
    createdAt: Date;
}

/**
 * Represents a user-defined label for an Action.
 */
export interface ActionLabel {
    name: string;
    projectId: string;
    actionHash: string;
    userId: string;
}
