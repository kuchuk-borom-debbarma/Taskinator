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

// Start API immediately — no dependency on Kafka
startRestServer(3000);

// Phase 1: Connect producer + auto-create all Kafka topics via admin client.
// Must complete before consumers subscribe, otherwise topics may not exist yet.
await eventBus.init();

// Phase 2: Start all domain services and consumers in parallel now that topics exist.
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
]).then(() => {
    startOutboxRelay();
});

