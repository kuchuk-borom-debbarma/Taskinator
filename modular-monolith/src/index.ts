import { projectService } from './services/project';
import { teamService } from './services/team';
import { taskService } from './services/task';
import { startConsumers } from './kafka/registry';
import { startRestServer } from './restful';

await Promise.all([
    projectService.init(),
    teamService.init(),
    taskService.init(),
    startConsumers(),
]);

startRestServer(3000);
