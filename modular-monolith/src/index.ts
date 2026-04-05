import { projectService } from './services/project';
import { teamService } from './services/team';
import { taskService } from './services/task';
import { authService } from './services/auth/index.ts';
import { externalNotificationService } from './services/external-notification/index.ts';
import { startConsumers } from './kafka/registry';
import { startRestServer } from './restful';
import { taskTriggerService } from './services/task-trigger';

// Start API immediately
startRestServer(3000);

await Promise.all([
    projectService.init(),
    teamService.init(),
    taskService.init(),
    taskTriggerService.init(),
    authService.init(),
    externalNotificationService.init(),
    startConsumers(),
]);
