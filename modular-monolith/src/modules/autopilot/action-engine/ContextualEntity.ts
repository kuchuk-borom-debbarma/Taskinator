import type { ActionTarget } from './types';

/**
 * Interface for the lazy resolution registry.
 * Defined here to avoid circular dependencies if needed,
 * or just to provide the contract for ContextualEntity.
 */
export interface IAsyncResolverRegistry {
    resolve(
        source: ContextualEntity,
        target: ActionTarget | string,
    ): Promise<ContextualEntity>;
}

/**
 * Runtime wrapper for entities participating in the Action Engine.
 * Provides dirty tracking, lazy resolution, and basic validation.
 */
export class ContextualEntity {
    private dirtyFields: Set<string> = new Set();
    private resolvedTargets: Map<string, ContextualEntity> = new Map();

    constructor(
        public readonly type: string,
        public readonly id: string,
        private data: Record<string, any>,
        private registry: IAsyncResolverRegistry,
    ) {}

    /**
     * Gets a field value from the entity data.
     */
    public get(field: string): any {
        return this.data[field];
    }

    /**
     * Sets a field value and marks it as dirty.
     * Performs basic runtime validation.
     */
    public set(field: string, value: any): void {
        this.validate(field, value);

        const currentValue = this.data[field];
        if (currentValue !== value) {
            this.data[field] = value;
            this.dirtyFields.add(field);
        }
    }

    /**
     * Resolves a related entity lazily.
     * Results are cached locally to prevent N+1 and infinite loops.
     */
    public async resolve(
        target: ActionTarget | string,
    ): Promise<ContextualEntity> {
        if (this.resolvedTargets.has(target)) {
            return this.resolvedTargets.get(target)!;
        }

        const resolved = await this.registry.resolve(this, target);
        this.resolvedTargets.set(target, resolved);
        return resolved;
    }

    /**
     * Returns a record of fields that have been modified.
     */
    public getChanges(): Record<string, any> {
        const changes: Record<string, any> = {};
        for (const field of this.dirtyFields) {
            changes[field] = this.data[field];
        }
        return changes;
    }

    /**
     * Basic runtime validation for common fields.
     * Based on Research Pitfall 3.
     */
    private validate(field: string, value: any): void {
        // Validation rules based on field names
        if (field === 'status' && typeof value !== 'string') {
            throw new Error(
                `Validation failed: ${field} must be string, got ${typeof value}`,
            );
        }
        if (field === 'priority' && typeof value !== 'number') {
            throw new Error(
                `Validation failed: ${field} must be number, got ${typeof value}`,
            );
        }
        if (
            (field === 'title' || field === 'name') &&
            typeof value !== 'string'
        ) {
            throw new Error(
                `Validation failed: ${field} must be string, got ${typeof value}`,
            );
        }
    }
}
