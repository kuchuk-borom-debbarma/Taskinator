import { projectService } from './modules/project';
import { teamService } from './modules/team';
import { taskService } from './modules/task';
import { authService } from './modules/auth/index.ts';
import { externalNotificationService } from './modules/external-notification/index.ts';
import { startConsumers } from './kafka/registry';
import { startRestServer } from './restful';
import { taskTriggerService } from './modules/task-trigger';

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
