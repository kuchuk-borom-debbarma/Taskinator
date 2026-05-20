import type { z } from 'zod';

/**
 * Interface contract that every scope-specific database context resolver must implement.
 */
export interface ContextResolver<T = any> {
    scope: string;
    schema: z.ZodType<T>;
    resolve(
        entityId: string,
        actorId: string,
        traceId: string,
        wasSnapshot?: Record<string, any>,
    ): Promise<T>;
}

/**
 * Central registry mapping scopes (e.g. 'TASK') to their specific context resolvers.
 */
export class ContextResolverRegistry {
    private resolvers = new Map<string, ContextResolver>();

    /**
     * Registers a unique context resolver.
     */
    registerResolver(resolver: ContextResolver): void {
        if (this.resolvers.has(resolver.scope)) {
            throw new Error(
                `[ContextResolverRegistry] Duplicate resolver registered for scope: "${resolver.scope}"`,
            );
        }
        this.resolvers.set(resolver.scope, resolver);
    }

    /**
     * Retrieves the registered context resolver for the given scope.
     */
    getResolver(scope: string): ContextResolver {
        const resolver = this.resolvers.get(scope);
        if (!resolver) {
            throw new Error(
                `[ContextResolverRegistry] No context resolver found for scope: "${scope}"`,
            );
        }
        return resolver;
    }

    /**
     * Clears all registered resolvers. (Mainly for test isolation).
     */
    clear(): void {
        this.resolvers.clear();
    }
}

export const contextResolverRegistry = new ContextResolverRegistry();

/**
 * Unified entrypoint to dynamically fetch and validate entity context from the database.
 *
 * @param scope The entity scope name (e.g. 'TASK').
 * @param entityId The unique identifier of the target entity.
 * @param actorId The actor initiating the event.
 * @param traceId The unique trace identifier tracking execution recursion.
 * @param wasSnapshot Optional previous state snapshot.
 */
export async function fetchContext(
    scope: string,
    entityId: string,
    actorId: string,
    traceId: string,
    wasSnapshot?: Record<string, any>,
): Promise<any> {
    const resolver = contextResolverRegistry.getResolver(scope);
    const rawContext = await resolver.resolve(
        entityId,
        actorId,
        traceId,
        wasSnapshot,
    );

    // Validate the resolved context shape against the scope's strict Zod schema
    const result = resolver.schema.safeParse(rawContext);
    if (!result.success) {
        throw new Error(
            `[ContextEngine] Context validation failed for scope "${scope}". Errors: ${JSON.stringify(
                result.error.issues,
            )}`,
        );
    }

    return result.data;
}
