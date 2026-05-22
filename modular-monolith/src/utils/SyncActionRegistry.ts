import { logger } from '../logger/index.js';

/**
 * A lightweight registry for synchronous side-effects that need to run in the request lifecycle.
 * Decouples modules by avoiding direct static imports between services.
 */
export type SyncHandler = (event: any) => Promise<void>;

class SyncActionRegistry {
    private handlers = new Map<string, SyncHandler[]>();

    /**
     * Registers a synchronous handler for a specific event type.
     */
    registerHandler(eventType: string, handler: SyncHandler): void {
        const existing = this.handlers.get(eventType) ?? [];
        this.handlers.set(eventType, [...existing, handler]);
        logger.info(
            `[SyncActionRegistry] Registered handler for: ${eventType}`,
        );
    }

    /**
     * Executes all registered handlers for an event type sequentially.
     * Guaranteed to return only after all handlers are attempted.
     * Errors in individual handlers are caught and logged to ensure "Log and Proceed" semantics.
     */
    async executeHandlers(eventType: string, payload: any): Promise<void> {
        const registered = this.handlers.get(eventType);
        if (!registered || registered.length === 0) {
            return;
        }

        logger.debug(
            `[SyncActionRegistry] Executing ${registered.length} handler(s) for: ${eventType}`,
        );

        for (const handler of registered) {
            try {
                await handler(payload);
            } catch (err) {
                // ORCH-02: Log and Proceed Fault Tolerance
                logger.error(
                    `[SyncActionRegistry] Handler failed for event "${eventType}". Log and Proceed.`,
                    err,
                );
            }
        }
    }
}

export const syncActionRegistry = new SyncActionRegistry();
