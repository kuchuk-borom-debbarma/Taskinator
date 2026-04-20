import { projectService } from './modules/project';
import { teamService } from './modules/team';
import { authService } from './modules/auth/index.ts';
import { externalNotificationService } from './modules/external-notification/index.ts';
import { internalNotificationService } from './modules/internal-notification/index.ts';
import { startConsumers } from './kafka/registry.ts';
import { yoga } from './graphql';
import { startOutboxRelay } from './utils/event-bus/OutboxRelay';
import { startRedisBridge } from './redis/RealtimeRedisBridge';
import eventBus from './utils/EventBus';

/**
 * Main Application Boot Sequence
 *
 * Order is critical:
 * 1. Global Event Bus (Connect producer + auto-create Kafka topics)
 * 2. Domain Services & Consumer Groups (Join Kafka and initialize internal state)
 * 3. GraphQL Endpoint (Only start accepting traffic once ready)
 * 4. Background Relay (Once everything is up, start the outbox poller)
 */
async function bootstrap() {
    try {
        console.log('[Boot] Initializing Taskinator Modular Monolith...');

        // Phase 1: Infrastructure
        await eventBus.init();
        console.log('[Boot] Phase 1: Infrastructure connected (Kafka)');

        // Phase 2: Domain Logic & Consumers
        await Promise.all([
            projectService.init(),
            teamService.init(),
            authService.init(),
            externalNotificationService.init(),
            internalNotificationService.init(),
            startConsumers(),
            startRedisBridge(),
        ]);
        console.log('[Boot] Phase 2: Domain modules and listeners ready');

        // Phase 3: Public API (GraphQL)
        const server = Bun.serve({
            fetch: yoga,
            port: 3000,
        });
        console.log(`[Boot] Phase 3: GraphQL API layer available at ${server.url}`);

        // Phase 4: Background Processing
        startOutboxRelay();
        console.log('[Boot] Phase 4: Outbox Relay started');

        console.log(
            '[Boot] >>> Taskinator is fully READY to handle 10k RPS <<<',
        );
    } catch (err) {
        console.error('[Boot] CRITICAL: Post-initialization failure', err);
        process.exit(1);
    }
}

bootstrap();
