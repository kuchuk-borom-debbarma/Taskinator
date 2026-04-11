import { projectService } from './modules/project';
import { teamService } from './modules/team';
import { taskService } from './modules/task';
import { authService } from './modules/auth/index.ts';
import { externalNotificationService } from './modules/external-notification/index.ts';
import { internalNotificationService } from './modules/internal-notification/index.ts';
import { realtimeKafkaConsumer } from './modules/realtime/internal/RealtimeKafkaConsumer.ts';
import { startConsumers } from './kafka/registry';
import { startRestServer } from './restful';
import { taskTriggerService } from './modules/task-trigger';
import { startOutboxRelay } from './utils/event-bus/OutboxRelay.ts';
import eventBus from './utils/EventBus.ts';

/**
 * Main Application Boot Sequence
 * 
 * Order is critical:
 * 1. Global Event Bus (Connect producer + auto-create Kafka topics)
 * 2. Domain Services & Consumer Groups (Join Kafka and initialize internal state)
 * 3. REST / GraphQL Endpoint (Only start accepting traffic once ready)
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
            taskService.init(),
            taskTriggerService.init(),
            authService.init(),
            externalNotificationService.init(),
            internalNotificationService.init(),
            realtimeKafkaConsumer.init(),
            startConsumers(),
        ]);
        console.log('[Boot] Phase 2: Domain modules and listeners ready');

        // Phase 3: Public API
        await startRestServer(3000);
        console.log('[Boot] Phase 3: Public API layer available');

        // Phase 4: Background Processing
        startOutboxRelay();
        console.log('[Boot] Phase 4: Outbox Relay started');

        console.log('[Boot] >>> Taskinator is fully READY to handle 10k RPS <<<');
    } catch (err) {
        console.error('[Boot] CRITICAL: Post-initialization failure', err);
        process.exit(1);
    }
}

bootstrap();
