export interface DomainContextResolver {
    resolve(id: string): Promise<Record<string, any> | null>;
}

export type EvaluationContext = Record<string, any>;

export class ContextService {
    private resolvers: Map<string, DomainContextResolver> = new Map();

    registerResolver(domain: string, resolver: DomainContextResolver) {
        this.resolvers.set(domain, resolver);
    }

    async buildContext(
        domain: string,
        id: string,
        eventPayload: Record<string, any> = {},
    ): Promise<EvaluationContext> {
        const resolver = this.resolvers.get(domain);
        if (!resolver) {
            throw new Error(`No resolver registered for domain: ${domain}`);
        }

        const liveState = await resolver.resolve(id);
        if (!liveState) {
            return {}; // Or throw if we expect the entity to exist
        }

        const context: EvaluationContext = {};

        // 1. Flatten Live State
        for (const [key, value] of Object.entries(liveState)) {
            context[`${domain}:${key}`] = value;
        }

        // 2. Merge Event Payload for Change Detection
        // If eventPayload has 'field', 'oldValue', 'newValue', we add flags
        if (eventPayload.field) {
            context[`${domain}:${eventPayload.field}:changed`] = true;
            context[`${domain}:${eventPayload.field}:old`] =
                eventPayload.oldValue;
        }

        // Merge all other event data
        for (const [key, value] of Object.entries(eventPayload)) {
            if (!context[`${domain}:${key}`]) {
                context[`${domain}:${key}`] = value;
            }
        }

        return context;
    }
}
