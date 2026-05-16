import type {
    ContextualEntity,
    IAsyncResolverRegistry,
} from './ContextualEntity';
import type { ActionTarget } from './types';

/**
 * Function signature for resolving a target entity from a source entity.
 */
export type ResolverFn = (
    source: ContextualEntity,
) => Promise<ContextualEntity>;

/**
 * Registry for lazy entity resolvers.
 * Allows mapping (sourceType, target) to a specific resolver function.
 */
export class AsyncResolverRegistry implements IAsyncResolverRegistry {
    private resolvers: Map<string, ResolverFn> = new Map();

    /**
     * Registers a resolver for a specific source type and target.
     */
    public register(
        sourceType: string,
        target: ActionTarget | string,
        resolver: ResolverFn,
    ): void {
        const key = this.getKey(sourceType, target);
        this.resolvers.set(key, resolver);
    }

    /**
     * Resolves a target entity from a source entity.
     * Throws if no resolver is registered for the given source type and target.
     */
    public async resolve(
        source: ContextualEntity,
        target: ActionTarget | string,
    ): Promise<ContextualEntity> {
        const key = this.getKey(source.type, target);
        const resolver = this.resolvers.get(key);

        if (!resolver) {
            throw new Error(
                `No resolver registered for ${source.type} -> ${target}`,
            );
        }

        return await resolver(source);
    }

    private getKey(sourceType: string, target: string): string {
        return `${sourceType}:${target}`;
    }
}
