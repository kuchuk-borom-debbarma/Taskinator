import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

export interface ReachabilitySignalStep {
    projectId: string;
    ancestorId: string;
    frontierId: string;
    action: 'ADD' | 'REMOVE';
    depth: number;
}

/**
 * Handler for initial reachability expansion signals.
 */
export class ReachabilityExpansionHandler {
    async triggerInitialExpansion(
        projectId: string,
        additions: { s: string; t: string }[],
        removals: { s: string; t: string }[],
    ) {
        if (additions.length === 0 && removals.length === 0) return;

        // Step 0: Find ancestors of the sources in a batch later in the listener,
        // but for the START signal, we just pass the (S, T) pairs.
        // Actually, the documentation says Step 0 is Ancestors(S) reaches T.
        // To keep the handler simple, we'll emit the "Link Changed" signal
        // and let the listener do the "Ancestor" lookup in one DB call.

        const steps: ReachabilitySignalStep[] = [
            ...additions.map((a) => ({
                projectId,
                ancestorId: a.s, // In Step 0, ancestor is the source itself
                frontierId: a.t,
                action: 'ADD' as const,
                depth: 1,
            })),
            ...removals.map((r) => ({
                projectId,
                ancestorId: r.s,
                frontierId: r.t,
                action: 'REMOVE' as const,
                depth: 1,
            })),
        ];

        logger.info(
            `[Reachability Handler] Signaling initial expansion for ${steps.length} paths in Project ${projectId}`,
        );

        await eventBus.publish(
            KAFKA_TOPICS.TASK_AGGREGATED,
            KAFKA_EVENTS.TASK_AGGREGATED.REACHABILITY_EXPAND,
            {
                key: projectId,
                data: { steps },
            },
        );
    }
}
